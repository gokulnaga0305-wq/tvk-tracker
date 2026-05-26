"""Backfill `district` column on existing incidents.

Two-pass:
  1. Dictionary lookup (free, fast) for every row with non-null location
  2. Optional --ai-fallback pass for rows the dictionary couldn't resolve

Idempotent — already-tagged rows are skipped.

Usage:
    python scripts/backfill_districts.py                  # dict-only
    python scripts/backfill_districts.py --ai-fallback    # also call Claude for unknowns
    python scripts/backfill_districts.py --dry-run
"""
from __future__ import annotations
import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


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

from app.database import get_db                                       # noqa: E402
from app.ingestion.district_mapper import map_location_to_district, map_location_via_ai  # noqa: E402


def run(*, dry_run: bool, use_ai: bool) -> int:
    db = get_db()
    # Fetch everything missing a district that HAS a location
    res = (
        db.table("incidents")
        .select("id, location, district")
        .is_("district", "null")
        .not_.is_("location", "null")
        .execute()
    )
    rows = res.data or []
    print(f"[i] {len(rows)} incidents without district tag (and with a location)")

    tagged_dict = 0
    tagged_ai   = 0
    still_null  = 0

    for row in rows:
        loc = row.get("location") or ""
        d = map_location_to_district(loc)
        source = "dict"
        if not d and use_ai:
            d = map_location_via_ai(loc)
            source = "ai" if d else None

        if not d:
            still_null += 1
            print(f"  [—] {loc[:60]:60s}  (no match)")
            continue

        if dry_run:
            print(f"  [dry-{source}] {loc[:60]:60s} -> {d}")
        else:
            try:
                db.table("incidents").update({"district": d}).eq("id", row["id"]).execute()
                print(f"  [OK-{source}] {loc[:60]:60s} -> {d}")
            except Exception as e:
                print(f"  [err] {loc}: {e}")
                continue

        if source == "dict":
            tagged_dict += 1
        elif source == "ai":
            tagged_ai += 1

    print()
    print(f"==== Summary ====")
    print(f"  tagged via dict: {tagged_dict}")
    print(f"  tagged via AI:   {tagged_ai}")
    print(f"  still null:      {still_null}")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run",      action="store_true")
    ap.add_argument("--ai-fallback",  action="store_true", help="Use Claude for unknown localities")
    args = ap.parse_args()
    sys.exit(run(dry_run=args.dry_run, use_ai=args.ai_fallback))
