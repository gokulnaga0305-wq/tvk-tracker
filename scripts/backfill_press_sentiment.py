"""One-shot backfill of `press_sentiment` for press-tier incidents that
were ingested before migration 010 added the column.

Finds every approved incident where:
  - press_sentiment IS NULL, AND
  - at least one of its source URLs maps (via OUTLET_REGISTRY) to a
    PRESS_TIERS outlet (primary / established_press / regional_press /
    online_native).

For each match, asks the same Claude model used by the live ingestion
pipeline to classify the article's tone toward TVK govt (positive /
negative / neutral) using the headline + summary on the row.

Idempotent — already-classified rows are skipped on every run.

Usage:
    python scripts/backfill_press_sentiment.py              # do it
    python scripts/backfill_press_sentiment.py --dry-run    # just count
    python scripts/backfill_press_sentiment.py --limit 20   # batch
    python scripts/backfill_press_sentiment.py --since 2026-05-01

Cost: ~$0.0008 per article via Claude Haiku 4.5. 135 articles -> ~$0.11.
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import time
from pathlib import Path

try:
    # Windows cp1252 console chokes on Tamil/emoji chars in print() — switch
    # stdout to UTF-8 so progress logs don't crash mid-loop and lose writes.
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))


def _load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env(ROOT / "backend" / ".env")

from app.database import get_db                                      # noqa: E402
from app.ingestion.corroboration import _identify_outlet, PRESS_TIERS  # noqa: E402
from app.ingestion.ai_processor import _get_client_and_model, _strip_code_fences  # noqa: E402


# Lean prompt — we already have the title + summary extracted, so we just
# need the classifier output. Avoids re-doing the full extraction pipeline.
SENTIMENT_PROMPT = """You are a press-tone classifier for a Tamil Nadu accountability dashboard.

Context: TVK (Tamilaga Vettri Kazhagam) is the incumbent state government
under CM Vijay since May 11, 2026. The previous DMK govt (Stalin) ran
2021-2026.

Classify the press article below by its TONE TOWARD THE TVK GOVT:

  positive_for_govt = praises a TVK action, attributes a good outcome
                      to TVK, defends a TVK minister, claims achievement
  negative_for_govt = criticises TVK action/inaction, attributes a bad
                      outcome to TVK, reports failure / scandal /
                      broken promise with evidence
  neutral           = straight factual reporting with no clear lean
                      either way

Be ANALYTICAL not partisan: classify by the article's framing & tone,
NOT by your own view of whether TVK deserves praise or blame.

ARTICLE:
  Source outlet: {outlet}
  Headline:      {title}
  Summary:       {summary}
  Category:      {category}

Respond with ONLY valid JSON like:
  {{"sentiment": "negative_for_govt", "reason": "one sentence why"}}

No markdown fences, no extra text."""


def classify(client, model, *, outlet: str, title: str, summary: str, category: str) -> dict | None:
    prompt = SENTIMENT_PROMPT.format(
        outlet=outlet or "unknown",
        title=title or "",
        summary=summary or "",
        category=category or "",
    )
    try:
        resp = client.chat.completions.create(
            model=model,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = _strip_code_fences(resp.choices[0].message.content)
        parsed = json.loads(raw)
        sent = parsed.get("sentiment")
        if sent not in {"positive_for_govt", "negative_for_govt", "neutral"}:
            return None
        return {"sentiment": sent, "reason": parsed.get("reason", "")}
    except json.JSONDecodeError:
        return None
    except Exception as e:
        print(f"    [err] {type(e).__name__}: {e}")
        return None


def get_press_outlet(incident: dict, sources_map: dict[str, dict]) -> str | None:
    """Return the canonical outlet name if at least one source URL maps to a
    press tier — used to decide whether the row is eligible for sentiment
    classification."""
    for url in incident.get("source_urls") or []:
        # Prefer the sources-table entry (which already has tier resolved)
        src = sources_map.get(url)
        if src:
            tier = src.get("credibility_tier")
            outlet = src.get("outlet")
            if tier in PRESS_TIERS and outlet:
                return outlet
        # Fall back to identifying via URL alone
        outlet, tier = _identify_outlet(url, "")
        if tier in PRESS_TIERS and outlet:
            return outlet
    return None


def run(*, dry_run: bool, limit: int | None, since: str | None) -> int:
    db = get_db()
    client, model = _get_client_and_model()
    if client is None:
        print("[x] No AI provider configured (OPENROUTER_API_KEY or ANTHROPIC_API_KEY)")
        return 2

    # 1) Fetch candidates: approved + sentiment IS NULL
    print("[i] Fetching candidate incidents...")
    q = (
        db.table("incidents")
        .select("id, title, summary, category, source_urls, press_sentiment, incident_date")
        .eq("status", "approved")
        .is_("press_sentiment", "null")
        .order("incident_date", desc=True)
    )
    if since:
        q = q.gte("incident_date", since)
    res = q.execute()
    incidents = res.data or []
    print(f"[i] Found {len(incidents)} approved incidents with no sentiment yet")

    if not incidents:
        return 0

    # 2) Bulk-fetch sources for tier lookup so we don't N+1
    all_urls = list({u for inc in incidents for u in (inc.get("source_urls") or [])})
    sources_map: dict[str, dict] = {}
    if all_urls:
        # Supabase .in_() chokes on very large arrays or URL chars sometimes.
        # Use chunked fetches and tolerate per-chunk failures (we have
        # fallback URL identification anyway).
        for chunk_start in range(0, len(all_urls), 25):
            chunk = all_urls[chunk_start:chunk_start + 25]
            try:
                src_res = (
                    db.table("sources")
                    .select("url, outlet, credibility_tier")
                    .in_("url", chunk)
                    .execute()
                )
                for s in (src_res.data or []):
                    sources_map[s["url"]] = s
            except Exception:
                # Silently continue — fallback URL identifier picks up the slack
                pass
        print(f"[i] Resolved tier for {len(sources_map)} of {len(all_urls)} URLs via sources table")

    # 3) Filter to ones that have at least one press-tier source
    eligible: list[tuple[dict, str]] = []
    for inc in incidents:
        outlet = get_press_outlet(inc, sources_map)
        if outlet:
            eligible.append((inc, outlet))
    print(f"[i] {len(eligible)} are from press-tier outlets (rest are citizen/social — skipped)")

    if limit:
        eligible = eligible[:limit]
        print(f"[i] Limited to first {limit}")

    if dry_run:
        print()
        print("DRY RUN — would classify:")
        for inc, outlet in eligible[:20]:
            print(f"  [{outlet:25s}] {(inc.get('title') or '')[:80]}")
        if len(eligible) > 20:
            print(f"  ... and {len(eligible) - 20} more")
        return 0

    # 4) Classify + update one at a time (rate-friendly)
    by_sent = {"positive_for_govt": 0, "negative_for_govt": 0, "neutral": 0, "unclassified": 0}
    for i, (inc, outlet) in enumerate(eligible, 1):
        title = inc.get("title") or ""
        result = classify(
            client, model,
            outlet=outlet,
            title=title,
            summary=inc.get("summary") or "",
            category=inc.get("category") or "",
        )
        if not result:
            by_sent["unclassified"] += 1
            print(f"  [{i:3d}/{len(eligible)}] SKIP  {outlet:20s} :: {title[:60]}")
            continue
        sentiment = result["sentiment"]
        by_sent[sentiment] += 1
        try:
            db.table("incidents").update({"press_sentiment": sentiment}).eq("id", inc["id"]).execute()
            label = {"positive_for_govt": "PRO ", "negative_for_govt": "ANTI", "neutral": "neut"}[sentiment]
            print(f"  [{i:3d}/{len(eligible)}] {label} {outlet:20s} :: {title[:60]}")
        except Exception as e:
            print(f"  [{i:3d}/{len(eligible)}] WRITE-ERR {e}")
            by_sent["unclassified"] += 1

        # Polite pacing — 0.5s between calls. OpenRouter handles fine,
        # but the corroboration sweep + monitor scripts also share quota.
        time.sleep(0.5)

    print()
    print("==== Summary ====")
    print(f"  positive_for_govt: {by_sent['positive_for_govt']}")
    print(f"  negative_for_govt: {by_sent['negative_for_govt']}")
    print(f"  neutral:           {by_sent['neutral']}")
    print(f"  unclassified:      {by_sent['unclassified']} (Claude parse fail / write err)")
    classified_total = sum(by_sent[k] for k in ("positive_for_govt", "negative_for_govt", "neutral"))
    if classified_total > 0:
        net = (by_sent["positive_for_govt"] - by_sent["negative_for_govt"]) / classified_total
        print(f"  net press tone:    {net:+.2f}  (negative ~ anti-incumbency)")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Just count, don't call AI")
    ap.add_argument("--limit",   type=int, default=None, help="Process at most N rows")
    ap.add_argument("--since",   type=str, default=None,
                    help="Only incidents with incident_date >= YYYY-MM-DD")
    args = ap.parse_args()
    sys.exit(run(dry_run=args.dry_run, limit=args.limit, since=args.since))
