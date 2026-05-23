"""
TRUTH AUDIT — downgrade dishonestly labeled "admin_verified" incidents.

Background:
    The Reddit bulk-import script (scripts/import_tvkfiles_subreddit.py) was
    inserting r/TVKFiles posts with verification_status='admin_verified' and
    ai_confidence=1.0. Neither was true — they were never admin-reviewed,
    just bulk-imported. The badge misled users.

What this script does (idempotent — safe to re-run):
    1. Find every approved incident where ALL sources are social-tier
       (reddit_tvkfiles, reddit_chennai, reddit_tamilnadu, twitter, x, reddit)
       AND it's currently labeled 'admin_verified' OR 'multi_source_verified'
       without an actual press source.
    2. Downgrade verification_status -> 'pending_verification'.
    3. Lower ai_confidence to the realistic 0.5 baseline (was inflated to 1.0).
    4. Write an audit log entry for each change.
    5. Keep status='approved' — they REMAIN PUBLICLY VISIBLE — just with the
       honest "Single source · unverified" badge on the card.

The auto-promote pathway (in ai_processor.process_article) will later upgrade
any of these to 'multi_source_verified' when a press source independently
reports the same event (matched by event_signature).

Usage (from project root):
    cd backend
    python ../scripts/truth_audit_migration.py            # dry-run, just count
    python ../scripts/truth_audit_migration.py --apply    # actually update
"""
import sys, argparse
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.database import get_db

SOCIAL_OUTLETS = {
    'reddit_tvkfiles', 'reddit_chennai', 'reddit_tamilnadu',
    'reddit', 'twitter', 'x', 'youturn', 'spark_plus',
}

# Social tier alone is never enough for the "verified" badge.
PRESS_TIERS = {'primary', 'established_press', 'regional_press', 'online_native'}


def is_social_only(source_records: list[dict]) -> bool:
    """True if every source on this incident is from a social/community outlet."""
    if not source_records:
        return False  # no sources tracked → don't touch (could be admin-created)
    return all(s.get('outlet') in SOCIAL_OUTLETS for s in source_records)


def main(apply: bool):
    db = get_db()

    # Pull every approved incident — we'll filter in Python because Supabase
    # PostgREST doesn't easily express "all sources match X" joins.
    print("Fetching all approved incidents…")
    res = db.table("incidents").select(
        "id, verification_status, ai_confidence, source_urls, source_count"
    ).eq("status", "approved").execute()
    incidents = res.data or []
    print(f"  -> {len(incidents)} approved incidents")

    # Map source_url → outlet for quick lookup (one query, then in-memory)
    all_urls = set()
    for inc in incidents:
        for u in (inc.get("source_urls") or []):
            all_urls.add(u)
    outlet_map: dict[str, str] = {}
    if all_urls:
        # PostgREST URL has a max length; Reddit URLs are long, so 25 per batch
        # is safe. Fall back to per-row fetch if a batch still errors.
        url_list = list(all_urls)
        for i in range(0, len(url_list), 25):
            batch = url_list[i:i+25]
            try:
                sr = db.table("sources").select("url, outlet").in_("url", batch).execute()
                for row in (sr.data or []):
                    outlet_map[row["url"]] = row.get("outlet") or "unknown"
            except Exception:
                # Last resort: hit them one at a time
                for u in batch:
                    try:
                        r = db.table("sources").select("outlet").eq("url", u).single().execute()
                        if r.data:
                            outlet_map[u] = r.data.get("outlet") or "unknown"
                    except Exception:
                        outlet_map[u] = "unknown"

    to_downgrade = []
    for inc in incidents:
        urls = inc.get("source_urls") or []
        if not urls:
            continue

        # Reconstruct source records for is_social_only check
        recs = [{"outlet": outlet_map.get(u, "unknown")} for u in urls]
        if not is_social_only(recs):
            continue

        # Already correctly labeled — leave alone
        vs = inc.get("verification_status")
        if vs in (None, "pending_verification", "retracted"):
            continue

        to_downgrade.append(inc)

    print(f"\nIncidents that need downgrade (social-only but labeled '{'admin_verified'}'): {len(to_downgrade)}")

    if not apply:
        print("\nDRY RUN — pass --apply to actually update the database.")
        for inc in to_downgrade[:5]:
            print(f"  - {inc['id'][:8]}…  vs={inc['verification_status']}  conf={inc.get('ai_confidence')}")
        if len(to_downgrade) > 5:
            print(f"  …and {len(to_downgrade) - 5} more")
        return

    print("\nApplying updates…")
    now_iso = datetime.now(timezone.utc).isoformat()
    updated = 0
    for inc in to_downgrade:
        try:
            db.table("incidents").update({
                "verification_status": "pending_verification",
                # Lower confidence to a realistic baseline; the previous 1.0 was inflated
                "ai_confidence": min(inc.get("ai_confidence") or 0.5, 0.5),
            }).eq("id", inc["id"]).execute()

            # Write to incident_audit so the change is publicly traceable
            db.table("incident_audit").insert({
                "incident_id": inc["id"],
                "action": "verification_downgrade",
                "from_value": inc.get("verification_status"),
                "to_value": "pending_verification",
                "actor": "truth_audit_migration",
                "reason": "All sources are social-tier; re-labeled honestly. "
                          "Will auto-promote when a press source corroborates.",
            }).execute()
            updated += 1
            if updated % 25 == 0:
                print(f"  …{updated}/{len(to_downgrade)}")
        except Exception as e:
            print(f"  WARN: failed to update {inc['id']}: {e}")

    print(f"\n[OK] Updated {updated}/{len(to_downgrade)} incidents.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="Actually write changes (without this flag, just count).")
    args = ap.parse_args()
    main(apply=args.apply)
