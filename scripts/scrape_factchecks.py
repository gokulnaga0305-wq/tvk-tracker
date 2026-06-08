"""Standalone fact-check scraper runner.

Pulls NewsMeter Tamil/English fact-check RSS feeds, classifies each debunk
via the free AI chain, and inserts pro-/anti-TVK items into
`propaganda_events`. This is what keeps the "Pro-TVK content tracked"
(propaganda) page fresh.

Why this script exists: the scrape lives behind /api/cron/scrape-factcheckers
but was never scheduled — so the propaganda page froze at its May-29 seed.
This runs scrape_all_sources() to completion in a real process (GitHub
Actions), same pattern as scripts/ingest_rss.py.

Usage:
    python scripts/scrape_factchecks.py
    python scripts/scrape_factchecks.py --per-source 15

Env: loads backend/.env if present (local), else process env (GH secrets).
Needs SUPABASE_* + a working AI key (GROQ/GEMINI).
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


def main(per_source: int) -> int:
    from app.ingestion.factcheck_scraper import scrape_all_sources
    print(f"Fact-check scrape starting — {per_source} items/source max")
    res = scrape_all_sources(max_per_source=per_source)
    print("Done.")
    for src, stats in (res or {}).items():
        print(f"  {src}: {stats}")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-source", type=int, default=12)
    args = ap.parse_args()
    raise SystemExit(main(args.per_source))
