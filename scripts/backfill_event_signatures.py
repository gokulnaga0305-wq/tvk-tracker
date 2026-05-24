"""
BACKFILL event_signature on every incident.

The Reddit bulk-import inserted 295+ rows without setting event_signature.
The auto-promote logic in ai_processor.process_article matches on signature,
so without it those incidents can NEVER auto-promote when a press source
covers the same event.

This script computes the signature from (category, location, incident_date)
and writes it back. Idempotent — running again is a no-op for incidents that
already have one.

Usage (from project root):
    cd backend
    python ../scripts/backfill_event_signatures.py          # dry-run, count
    python ../scripts/backfill_event_signatures.py --apply  # actually write
"""
import sys, re, argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.database import get_db


def event_signature(category: str | None, location: str | None, incident_date: str | None) -> str:
    """Same logic as ai_processor._event_signature — keep in sync."""
    cat = (category or "other").lower()
    loc = re.sub(r"[^a-z0-9]+", "", (location or "").lower())[:30]
    d = (incident_date or "")[:10]  # 'YYYY-MM-DD' substring of any longer ISO string
    return f"{cat}:{loc}:{d}"


def main(apply: bool):
    db = get_db()

    print("Fetching all incidents…")
    res = db.table("incidents").select(
        "id, category, location, incident_date, event_signature"
    ).execute()
    incidents = res.data or []
    print(f"  -> {len(incidents)} total")

    needs_fill = [i for i in incidents if not i.get("event_signature")]
    print(f"  -> {len(needs_fill)} need event_signature backfilled")

    if not apply:
        print("\nDRY RUN — pass --apply to write changes")
        for inc in needs_fill[:5]:
            sig = event_signature(inc.get("category"), inc.get("location"), inc.get("incident_date"))
            print(f"  {inc['id'][:8]}  cat={inc.get('category'):20}  date={inc.get('incident_date')}  -> sig={sig}")
        return

    print(f"\nWriting event_signature for {len(needs_fill)} incidents…")
    updated = 0
    for inc in needs_fill:
        sig = event_signature(inc.get("category"), inc.get("location"), inc.get("incident_date"))
        try:
            db.table("incidents").update({"event_signature": sig}).eq("id", inc["id"]).execute()
            updated += 1
            if updated % 50 == 0:
                print(f"  …{updated}/{len(needs_fill)}")
        except Exception as e:
            print(f"  WARN: {inc['id']}: {e}")

    print(f"\n[OK] Backfilled signatures on {updated}/{len(needs_fill)} incidents")

    # Quick stats: how many sigs are now shared by 2+ rows?
    from collections import Counter
    res2 = db.table("incidents").select("event_signature").execute()
    c = Counter(r.get("event_signature") for r in (res2.data or []))
    shared = {s: n for s, n in c.items() if s and n >= 2}
    print(f"  -> {len(shared)} signatures are now shared by 2+ rows (auto-promote candidates)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    main(apply=args.apply)
