"""
Retroactive auto-promote sweep.

The auto-promote logic in ai_processor.process_article only fires when a
NEW article comes in. For historical data, we need to scan all existing
incidents and find duplicates (same event_signature) that should already
have been merged + promoted.

For each event_signature shared by N>=2 incidents:
  1. Pick the OLDEST as the canonical row (lowest created_at).
  2. Union all source_urls from every duplicate into it.
  3. Count DISTINCT outlets across the merged sources.
  4. If outlet_count >= 2 → set verification_status='multi_source_verified'.
  5. The other rows: mark verification_status='retracted' with reason
     pointing at the canonical id (so the audit trail explains the merge).
     We DO NOT delete — retraction is reversible, deletion is not.

Usage (from project root):
    cd backend
    python ../scripts/sweep_auto_promote.py            # dry-run, report
    python ../scripts/sweep_auto_promote.py --apply    # merge + promote
"""
import sys, argparse
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.database import get_db


def main(apply: bool):
    db = get_db()

    print("Fetching all approved incidents…")
    res = db.table("incidents").select(
        "id, event_signature, source_urls, source_count, verification_status, created_at, title"
    ).eq("status", "approved").execute()
    incidents = res.data or []
    print(f"  -> {len(incidents)} approved incidents")

    # Group by signature. SKIP signatures where the location component is
    # empty — those are different events the AI couldn't geotag, and merging
    # them would conflate distinct incidents.
    by_sig = defaultdict(list)
    skipped_empty_loc = 0
    for inc in incidents:
        sig = inc.get("event_signature")
        if not sig:
            continue
        # Signature format: "category:location:date" — middle segment empty = skip
        parts = sig.split(":")
        if len(parts) >= 3 and not parts[1].strip():
            skipped_empty_loc += 1
            continue
        by_sig[sig].append(inc)

    print(f"  -> Skipped {skipped_empty_loc} rows with empty-location signature (cannot safely merge)")
    dups = {s: rows for s, rows in by_sig.items() if len(rows) >= 2}
    print(f"  -> {len(dups)} signatures with 2+ rows AND a location (safe merge candidates)")
    print()

    if not dups:
        print("Nothing to merge.")
        return

    # Build outlet map for all relevant URLs
    all_urls = {u for rows in dups.values() for r in rows for u in (r.get("source_urls") or [])}
    outlet_map: dict[str, str] = {}
    url_list = list(all_urls)
    for i in range(0, len(url_list), 25):
        batch = url_list[i:i+25]
        try:
            sr = db.table("sources").select("url, outlet").in_("url", batch).execute()
            for row in (sr.data or []):
                outlet_map[row["url"]] = row.get("outlet") or "unknown"
        except Exception:
            for u in batch:
                try:
                    r = db.table("sources").select("outlet").eq("url", u).single().execute()
                    if r.data:
                        outlet_map[u] = r.data.get("outlet") or "unknown"
                except Exception:
                    outlet_map[u] = "unknown"

    plan = []
    for sig, rows in dups.items():
        # Pick oldest as canonical (most original report)
        rows_sorted = sorted(rows, key=lambda r: r.get("created_at") or "")
        canonical = rows_sorted[0]
        merged_urls = []
        seen = set()
        for r in rows_sorted:
            for u in (r.get("source_urls") or []):
                if u not in seen:
                    seen.add(u)
                    merged_urls.append(u)

        outlets = {outlet_map.get(u, "unknown") for u in merged_urls}
        outlets.discard("unknown")  # don't count unknown as a distinct outlet
        outlet_count = len(outlets)
        new_status = "multi_source_verified" if outlet_count >= 2 else "pending_verification"

        plan.append({
            "sig": sig,
            "canonical_id": canonical["id"],
            "canonical_title": (canonical.get("title") or "")[:60],
            "merged_urls": merged_urls,
            "outlets": sorted(outlets),
            "outlet_count": outlet_count,
            "new_status": new_status,
            "duplicate_ids": [r["id"] for r in rows_sorted[1:]],
        })

    # Report
    promotes = [p for p in plan if p["new_status"] == "multi_source_verified"]
    pending = [p for p in plan if p["new_status"] != "multi_source_verified"]

    print(f"Signatures that will PROMOTE to multi_source_verified: {len(promotes)}")
    for p in promotes:
        print(f"  • {p['sig']}")
        print(f"      canonical: {p['canonical_id'][:8]}  {p['canonical_title']}")
        print(f"      outlets ({p['outlet_count']}): {', '.join(p['outlets'])}")
        print(f"      duplicates to retract: {len(p['duplicate_ids'])}")

    print(f"\nSignatures that stay pending (still single outlet): {len(pending)}")
    for p in pending[:5]:
        print(f"  • {p['sig']}  outlets={p['outlets']}")

    if not apply:
        print("\nDRY RUN — pass --apply to actually merge + promote")
        return

    print("\nApplying merges…")
    promoted_count = 0
    retracted_count = 0
    for p in plan:
        try:
            # Update canonical with merged sources + (maybe) promoted status
            db.table("incidents").update({
                "source_urls": p["merged_urls"],
                "source_count": len(p["merged_urls"]),
                "verification_status": p["new_status"],
            }).eq("id", p["canonical_id"]).execute()

            db.table("incident_audit").insert({
                "incident_id": p["canonical_id"],
                "action": "retro_merge_promote",
                "to_value": p["new_status"],
                "actor": "sweep_auto_promote",
                "reason": f"Merged {len(p['duplicate_ids'])} duplicate(s) sharing event_signature. "
                          f"Distinct outlets: {p['outlet_count']} ({', '.join(p['outlets'])}).",
            }).execute()

            if p["new_status"] == "multi_source_verified":
                promoted_count += 1

            # Retract the duplicates (status stays approved=False - they're hidden)
            for dup_id in p["duplicate_ids"]:
                db.table("incidents").update({
                    "verification_status": "retracted",
                    "retraction_reason": f"Merged into {p['canonical_id']} — same event, both sources preserved on canonical row.",
                }).eq("id", dup_id).execute()
                db.table("incident_audit").insert({
                    "incident_id": dup_id,
                    "action": "retracted_duplicate",
                    "to_value": "retracted",
                    "actor": "sweep_auto_promote",
                    "reason": f"Duplicate of {p['canonical_id']} (same event_signature).",
                }).execute()
                retracted_count += 1

        except Exception as e:
            print(f"  WARN: failed for sig {p['sig']}: {e}")

    print(f"\n[OK] Promoted {promoted_count} incidents to multi_source_verified")
    print(f"[OK] Retracted {retracted_count} duplicates (audit log written)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    main(apply=args.apply)
