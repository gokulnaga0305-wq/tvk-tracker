"""
Purge Reddit commentary from the incidents pile.

The r/TVKFiles bulk import dumped ~295 posts into `incidents`. Many are
commentary, opinions, screenshots, or reaction threads — not concrete news
events. They can never auto-verify because press outlets don't cover them
(they're discussions ABOUT TVK, not events).

This script:
  1. Finds pending_verification incidents with no location set
  2. Runs each through a focused Claude prompt: "Is this a concrete news
     event or commentary?"
  3. Retracts the commentary ones with status='rejected' + audit log

Retracted incidents stay in the DB (reversible) but are hidden from the
public dashboard. The verified-vs-pending ratio becomes honest.

Cost: ~190 Claude calls × $0.0004 = ~$0.08

Usage (from project root):
    cd backend
    python ../scripts/purge_commentary.py                 # dry-run, show samples
    python ../scripts/purge_commentary.py --apply         # actually retract
    python ../scripts/purge_commentary.py --apply --limit 50
"""
import sys, json, time, argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

from app.database import get_db
from app.ingestion.ai_processor import _get_client_and_model, _strip_code_fences

CLASSIFY_PROMPT = """You triage Tamil Nadu accountability submissions. Decide whether the
following item is a CONCRETE NEWS EVENT worth tracking, or COMMENTARY/OPINION
that doesn't belong in an incidents database.

Return JSON only:
  {{"verdict": "event" | "commentary", "reason": "<one short sentence>"}}

EVENT = a specific incident with:
  - a named victim/perpetrator/official/place, AND
  - a concrete action or outcome (arrest, murder, scheme launch, FIR, raid,
    bribery case, power cut in named area, fact-check verdict, etc.)

COMMENTARY = everything else:
  - Opinions, reactions, takes ("Bro ena soldraru?", "This is so disappointing")
  - Generic political speculation ("TVK is going to do X")
  - Meta-discussion ("Another false narrative...")
  - Reaction threads, polls, polls-about-polls
  - Memes, screenshots of unrelated posts, reaction GIFs
  - Wish-statements ("Wish more attention was given to X")
  - Vague claims without specific named entities

EXAMPLES:
  "17-year-old teen Anbuselvan murdered in Pudukkottai"  -> event
  "TVK rebrands Kalaignar Magalir Urimai as new"         -> event
  "Bro ena soldraru?"                                     -> commentary
  "Another false narrative promoted by TVK"               -> commentary
  "Wish on ground issues got half the attention"          -> commentary
  "Sengottaiyan to TVK is Janda Plan??"                   -> commentary
  "Power cut in T. Nagar for 6 hours, residents protest" -> event

TITLE:   {title}
SUMMARY: {summary}

JSON:"""


def main(apply: bool, limit: int | None):
    db = get_db()
    client, model = _get_client_and_model()
    if client is None:
        print("ERROR: no AI provider configured")
        return

    res = db.table("incidents").select(
        "id, title, summary, location"
    ).eq("status", "approved").eq("verification_status", "pending_verification").execute()
    pending = res.data or []

    # Focus on the location-less ones — those are the most likely commentary
    candidates = [p for p in pending if not (p.get("location") or "").strip()]
    print(f"Pending incidents: {len(pending)}")
    print(f"Candidates (no location): {len(candidates)}")
    if limit:
        candidates = candidates[:limit]
        print(f"Limited to: {len(candidates)}")

    if not apply:
        print("\nDRY RUN — first 5 candidates:")
        for inc in candidates[:5]:
            print(f"  - {(inc.get('title') or '')[:80]}")
        print("\nPass --apply to actually classify and retract commentary.")
        return

    print(f"\nClassifying {len(candidates)} via Claude…")
    events = 0
    commentary = 0
    failed = 0

    for idx, inc in enumerate(candidates, 1):
        title = (inc.get("title") or "")[:300]
        summary = (inc.get("summary") or "")[:600]
        prompt = CLASSIFY_PROMPT.format(title=title, summary=summary)

        try:
            r = client.chat.completions.create(
                model=model,
                max_tokens=120,
                messages=[
                    {"role": "system", "content": "You return only JSON. No preamble."},
                    {"role": "user", "content": prompt},
                ],
            )
            raw = _strip_code_fences(r.choices[0].message.content or "")
            parsed = json.loads(raw)
            verdict = (parsed.get("verdict") or "").lower()
            reason = parsed.get("reason") or "no reason given"
        except Exception as e:
            failed += 1
            continue

        if verdict == "event":
            events += 1
        elif verdict == "commentary":
            commentary += 1
            try:
                db.table("incidents").update({
                    "status": "rejected",
                    "retraction_reason": f"AI classifier: commentary, not a concrete event. {reason}",
                }).eq("id", inc["id"]).execute()
                db.table("incident_audit").insert({
                    "incident_id": inc["id"],
                    "action": "purge_commentary",
                    "from_value": "approved/pending_verification",
                    "to_value": "rejected",
                    "actor": "purge_commentary_script",
                    "reason": reason,
                }).execute()
            except Exception as e:
                print(f"  WARN: write fail {inc['id']}: {e}")
                failed += 1
        else:
            failed += 1

        if idx % 25 == 0:
            print(f"  …{idx}/{len(candidates)}  events={events}, commentary={commentary}, fail={failed}")
        if idx % 10 == 0:
            time.sleep(0.2)  # tiny rate-limit

    print(f"\n[OK] of {len(candidates)} candidates:")
    print(f"  events (kept):      {events}")
    print(f"  commentary (retracted): {commentary}")
    print(f"  failed:             {failed}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()
    main(apply=args.apply, limit=args.limit)
