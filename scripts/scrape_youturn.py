"""Standalone YouTurn fact-check ingester.

Pulls YouTurn's GraphQL fact-check feed and inserts TN-political debunks into
`propaganda_events` (status='debunked', debunk_source='YouTurn'). Deterministic
mapping — no LLM, so it's free and unaffected by AI-provider quota.

Usage:
    python scripts/scrape_youturn.py                 # daily: last 7 days
    python scripts/scrape_youturn.py --days 45       # one-time backfill
    python scripts/scrape_youturn.py --days 45 --english   # also pull English feed

Env: loads backend/.env if present (local), else process env (GH secrets).
Needs SUPABASE_* only (no AI key required).
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

_env = ROOT / "backend" / ".env"
if _env.exists():
    for _line in _env.read_text(encoding="utf-8").splitlines():
        if "=" in _line and not _line.startswith("#"):
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))


def main(days: int, also_english: bool) -> int:
    from app.ingestion.youturn_graphql import ingest_youturn, LANG_TAMIL, LANG_ENGLISH
    print(f"YouTurn ingest starting — window={days}d")
    total = ingest_youturn(days_back=days, language_id=LANG_TAMIL)
    print(f"  Tamil:   {total}")
    if also_english:
        en = ingest_youturn(days_back=days, language_id=LANG_ENGLISH)
        print(f"  English: {en}")
    print("Done.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=7, help="how many days back to page")
    ap.add_argument("--english", action="store_true", help="also pull the English feed")
    args = ap.parse_args()
    raise SystemExit(main(args.days, args.english))
