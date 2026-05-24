"""
AI re-extraction of locations for Reddit-imported incidents with empty location.

The bulk import used a small keyword heuristic that missed locations on
~88% of posts. Without location, event_signature is too coarse to match
press articles → auto-promote can never fire.

This script:
  1. Finds approved incidents whose event_signature has an empty location
     component (e.g. "corruption::2026-05-22").
  2. For each one, runs a MINIMAL Claude prompt (location-only, ~150 tokens
     output) against title + summary.
  3. If a TN district/city is identified, writes it back AND rebuilds the
     event_signature so auto-promote can match it next time.
  4. Writes an audit log entry.

Cost: ~270 calls x ~$0.0004 = ~$0.10 total via OpenRouter.

Usage (from project root):
    cd backend
    python ../scripts/backfill_locations_ai.py            # dry-run, 5 samples
    python ../scripts/backfill_locations_ai.py --apply    # actually update all
    python ../scripts/backfill_locations_ai.py --apply --limit 50  # batched run
"""
import sys, re, json, argparse, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.database import get_db
from app.ingestion.ai_processor import _get_client_and_model, _strip_code_fences

LOCATION_PROMPT = """You are a geo-tagger for Tamil Nadu news. Given the incident
title and summary below, identify the SINGLE most specific TN district or city
mentioned. Return ONLY valid JSON with one key:

  {{"location": "<district or city name in English>"}}

Rules:
- If multiple locations are mentioned, pick the most specific/local one (city > district > state).
- If only "Tamil Nadu" or no specific place is mentioned, return {{"location": null}}.
- Normalize spellings: "Chennai" not "Madras", "Thoothukudi" not "Tuticorin", etc.
- Do NOT invent locations. If unsure, return null.
- For Tamil text, transliterate the place name to standard English.

TITLE: {title}

SUMMARY: {summary}

JSON:"""


def signature(category: str | None, location: str | None, incident_date: str | None) -> str:
    cat = (category or "other").lower()
    loc = re.sub(r"[^a-z0-9]+", "", (location or "").lower())[:30]
    d = (incident_date or "")[:10]
    return f"{cat}:{loc}:{d}"


def main(apply: bool, limit: int | None):
    db = get_db()
    client, model = _get_client_and_model()
    if client is None:
        print("ERROR: no AI provider configured (set OPENROUTER_API_KEY)")
        return

    print(f"Using model: {model}")
    print("Fetching approved incidents with empty-location signature…")

    res = db.table("incidents").select(
        "id, title, summary, category, incident_date, location, event_signature"
    ).eq("status", "approved").execute()
    incidents = res.data or []

    # Filter to those needing a backfill
    candidates = []
    for inc in incidents:
        sig = inc.get("event_signature") or ""
        parts = sig.split(":")
        loc_part = parts[1] if len(parts) >= 3 else ""
        # Only re-extract if signature has empty location AND no location field set
        if not loc_part.strip() and not (inc.get("location") or "").strip():
            candidates.append(inc)

    print(f"  -> {len(candidates)} incidents need location backfilled")

    if limit:
        candidates = candidates[:limit]
        print(f"  -> limited to first {len(candidates)}")

    if not apply:
        print("\nDRY RUN — showing 5 samples of what AI would be asked:")
        for inc in candidates[:5]:
            print(f"  {inc['id'][:8]}  title={(inc.get('title') or '')[:80]}")
        print("\nPass --apply to actually run.")
        return

    print(f"\nProcessing {len(candidates)} incidents…")
    updated = 0
    skipped = 0
    failed = 0

    for idx, inc in enumerate(candidates, 1):
        title = (inc.get("title") or "")[:300]
        summary = (inc.get("summary") or "")[:800]
        prompt = LOCATION_PROMPT.format(title=title, summary=summary)

        try:
            response = client.chat.completions.create(
                model=model,
                max_tokens=120,
                messages=[
                    {"role": "system", "content": "You return only JSON. No preamble."},
                    {"role": "user", "content": prompt},
                ],
            )
            raw = _strip_code_fences(response.choices[0].message.content or "")
            parsed = json.loads(raw)
            new_loc = (parsed.get("location") or "").strip()
        except json.JSONDecodeError:
            failed += 1
            continue
        except Exception as e:
            print(f"  WARN {idx}/{len(candidates)} {inc['id'][:8]}: {e}")
            failed += 1
            continue

        if not new_loc or new_loc.lower() in ("null", "none", "n/a", "tamil nadu"):
            skipped += 1
            if idx % 25 == 0:
                print(f"  …{idx}/{len(candidates)}  (no location found: {skipped}, updated: {updated})")
            continue

        new_sig = signature(inc.get("category"), new_loc, inc.get("incident_date"))
        try:
            db.table("incidents").update({
                "location": new_loc,
                "event_signature": new_sig,
            }).eq("id", inc["id"]).execute()

            db.table("incident_audit").insert({
                "incident_id": inc["id"],
                "action": "location_backfill",
                "from_value": "(empty)",
                "to_value": new_loc,
                "actor": "backfill_locations_ai",
                "reason": f"AI re-extracted location from title/summary. "
                          f"New signature: {new_sig}",
            }).execute()
            updated += 1
        except Exception as e:
            print(f"  WARN write failed {inc['id']}: {e}")
            failed += 1

        if idx % 25 == 0:
            print(f"  …{idx}/{len(candidates)}  (updated: {updated}, no-loc: {skipped}, fail: {failed})")

        # Tiny rate-limit pause every 10 calls
        if idx % 10 == 0:
            time.sleep(0.2)

    print(f"\n[OK] Updated {updated}, no-location found {skipped}, failed {failed}")
    print(f"     of {len(candidates)} candidates")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--limit", type=int, help="Process only first N candidates")
    args = ap.parse_args()
    main(apply=args.apply, limit=args.limit)
