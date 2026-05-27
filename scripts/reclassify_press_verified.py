"""One-shot: reclassify approved+pending_verification incidents whose
source IS a press outlet into the new `press_verified` status.

Why:
  - Old logic put all single-source incidents in 'pending_verification'
    regardless of whether the source was Reddit or The Hindu.
  - New logic (ai_processor.py) sets 'press_verified' for single-source
    incidents from PRESS_TIERS outlets. This script backfills the same
    distinction for incidents that were ingested before the change.

Idempotent. Safe to re-run.
"""
from __future__ import annotations
import argparse
import os
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))


def _load_env(path: Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env(ROOT / "backend" / ".env")

from app.database import get_db                                # noqa: E402
from app.ingestion.corroboration import _identify_outlet, PRESS_TIERS  # noqa: E402


def _is_social_platform(url: str, outlet: str | None) -> bool:
    """Return True if the URL/outlet is from a social-media platform
    (Reddit, raw user-generated posts) regardless of what tier the
    sources table stores. Twitter-hosted PRESS handles (sunnewstamil,
    News18TamilNadu etc.) are NOT considered social — only direct
    user posts are."""
    if outlet and "reddit" in outlet.lower():
        return True
    u = (url or "").lower()
    if "reddit.com" in u:
        return True
    return False


def run(*, dry_run: bool) -> int:
    db = get_db()
    # PASS A — Already verified but stuck in pending_review (visibility bug):
    #   multi_source_verified or press_verified + status=pending_review
    # These should simply have status flipped to 'approved' so they show on the
    # public dashboard. Already-verified content shouldn't be hidden.
    pre = db.table("incidents").select("id, title, verification_status").eq("status", "pending_review").in_("verification_status", ["multi_source_verified", "press_verified"]).execute()
    pre_rows = pre.data or []
    if pre_rows:
        print(f"[i] Pass A — {len(pre_rows)} already-verified items hidden in pending_review:")
        for r in pre_rows:
            label = "[dry] would approve" if dry_run else "[OK] approved"
            print(f"  {label} ({r.get('verification_status'):22s}): {r.get('title','')[:65]}")
            if not dry_run:
                db.table("incidents").update({"status": "approved"}).eq("id", r["id"]).execute()
        print()

    # PASS B — Fetch pending_verification incidents in BOTH approved + pending_review
    # so press-source items in pending_review also get promoted (was hidden).
    rows: list[dict] = []
    for s in ("approved", "pending_review"):
        res = (
            db.table("incidents")
            .select("id, title, source_urls, verification_status, status, ai_confidence")
            .eq("status", s)
            .eq("verification_status", "pending_verification")
            .execute()
        )
        rows.extend(res.data or [])
    print(f"[i] Pass B — {len(rows)} pending_verification incidents to evaluate (across both status types)")

    # Also bulk-fetch sources so we can tier-resolve in one shot
    all_urls = list({u for r in rows for u in (r.get("source_urls") or [])})
    sources_map: dict[str, dict] = {}
    if all_urls:
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
                pass

    flipped = 0
    kept = 0
    for r in rows:
        urls = r.get("source_urls") or []
        if not urls:
            kept += 1
            continue
        # Check ALL sources; if ANY is press-tier, the incident qualifies
        is_press = False
        chosen_outlet = None
        for u in urls:
            src = sources_map.get(u)
            tier = (src or {}).get("credibility_tier")
            outlet = (src or {}).get("outlet")
            if not tier:
                # Fallback to URL-based detection
                outlet, tier = _identify_outlet(u, "")
            # Exclude social-media platforms even if their stored tier
            # historically says 'online_native' (Reddit mis-tagging).
            if _is_social_platform(u, outlet):
                continue
            if tier in PRESS_TIERS:
                is_press = True
                chosen_outlet = outlet
                break

        if not is_press:
            kept += 1
            continue

        if dry_run:
            print(f"  [dry] -> press_verified + approved | {chosen_outlet:20s} | {r.get('title','')[:55]}")
        else:
            try:
                db.table("incidents").update({
                    "verification_status": "press_verified",
                    "status": "approved",          # also surface publicly
                }).eq("id", r["id"]).execute()
                try:
                    db.table("incident_audit").insert({
                        "incident_id": r["id"],
                        "action":      "reclassified",
                        "actor":       "reclassify_script",
                        "from_value":  "pending_verification",
                        "to_value":    "press_verified",
                        "reason":      f"Source is press-tier ({chosen_outlet}). Auto-reclassified by reclassify_press_verified.py.",
                    }).execute()
                except Exception:
                    pass
                print(f"  [OK]  -> press_verified | {chosen_outlet:20s} | {r.get('title','')[:60]}")
            except Exception as e:
                print(f"  [err] update failed for {r['id']}: {e}")
                continue
        flipped += 1

    print()
    print("==== Summary ====")
    print(f"  flipped to press_verified: {flipped}")
    print(f"  kept as pending (social only): {kept}")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sys.exit(run(dry_run=args.dry_run))
