"""Backfill / refresh the canonical fact_checks ledger from all sources.

Run AFTER applying database/025_fact_checks.sql in Supabase. Idempotent — safe
to re-run; it upserts on (origin, origin_id). Also runs on a schedule via the
backend's sync route once wired into cron.

    python scripts/sync_fact_checks.py
"""
from __future__ import annotations
import os, sys
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("="); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
from app.factcheck.sync import sync_all  # noqa: E402


def run() -> int:
    counts = sync_all()
    print("==== fact_checks sync complete ====")
    for k, v in counts.items():
        print(f"  {k:>18}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
