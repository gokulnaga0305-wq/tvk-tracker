"""Backfill the `sources` table for every URL referenced by an approved
incident. Direct-insert seed scripts (TTV anthem chain, industrial
flight, cow ban, Vadalur, etc.) skipped writing to the `sources` table
so the dashboard's source bylines showed 'unknown' on the detail page.

This script:
  1. Collects every distinct source URL across all incidents
  2. For each URL, derives (outlet_display_name, credibility_tier) from
     the host using the same map as the API enricher
  3. Upserts a row into `sources` so subsequent /api/incidents/* reads
     return the real outlet name without relying on the API-side fallback

Idempotent — run as many times as needed.
"""
from __future__ import annotations
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from app.database import get_db                                       # noqa: E402
from app.api.routes.incidents import _outlet_from_url                 # noqa: E402


def run() -> int:
    db = get_db()
    print("[i] Fetching all incident source_urls...")
    res = db.table("incidents").select("id, source_urls").execute()
    rows = res.data or []
    all_urls: set[str] = set()
    for r in rows:
        for u in (r.get("source_urls") or []):
            if isinstance(u, str) and u.strip():
                all_urls.add(u.strip())
    print(f"[i] {len(all_urls)} distinct source URLs across {len(rows)} incidents")

    # Find which already exist in the sources table — process in chunks
    print("[i] Checking existing sources table entries...")
    existing: set[str] = set()
    CHUNK = 30
    urls_list = list(all_urls)
    for start in range(0, len(urls_list), CHUNK):
        chunk = urls_list[start:start + CHUNK]
        try:
            r = db.table("sources").select("url").in_("url", chunk).execute()
            for s in (r.data or []):
                existing.add(s["url"])
        except Exception as e:
            print(f"  [warn] chunk fetch failed: {e}")
    missing = all_urls - existing
    print(f"[i] Already in sources: {len(existing)} | Missing: {len(missing)}")
    if not missing:
        print("[ok] Nothing to backfill.")
        return 0

    # Insert rows for missing URLs
    inserted = 0
    failed = 0
    rows_to_insert: list[dict] = []
    for url in missing:
        outlet, tier = _outlet_from_url(url)
        rows_to_insert.append({
            "url": url,
            "outlet": outlet,
            "credibility_tier": tier,
            "title": None,
        })

    # Insert in chunks
    for start in range(0, len(rows_to_insert), 50):
        chunk = rows_to_insert[start:start + 50]
        try:
            db.table("sources").insert(chunk).execute()
            inserted += len(chunk)
        except Exception as e:
            # Insert one at a time to skip the bad ones
            for row in chunk:
                try:
                    db.table("sources").insert(row).execute()
                    inserted += 1
                except Exception as e2:
                    failed += 1
                    if failed <= 5:
                        print(f"  [skip] {row['url'][:60]} :: {str(e2)[:80]}")

    print()
    print("==== Backfill summary ====")
    print(f"  inserted:  {inserted}")
    print(f"  failed:    {failed}")

    # Outlet distribution
    print()
    print("==== Outlet coverage now: ====")
    counts: dict[str, int] = {}
    for url in all_urls:
        outlet, _ = _outlet_from_url(url)
        counts[outlet] = counts.get(outlet, 0) + 1
    for outlet, n in sorted(counts.items(), key=lambda x: -x[1])[:20]:
        print(f"  {n:4d}  {outlet}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
