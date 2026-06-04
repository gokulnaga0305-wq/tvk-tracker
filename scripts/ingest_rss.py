"""Standalone RSS ingestion runner — completes the FULL source loop.

Why this exists
---------------
The HF Spaces endpoint /api/cron/scrape-press-rss runs ingest_all_sources
inside a FastAPI BackgroundTask. On HF's free tier that background task is
frequently KILLED partway through the ~17-source loop (only 2-3 sources
finish per run), so sources lower in the list — Sun News, News18 — starve
for days. (Confirmed: Sun News went 27h+ without a fresh pull.)

This script runs the exact same ingest_all_sources() coroutine to
COMPLETION in a real process (GitHub Actions runner or your laptop), so
every source is scraped every run. No dying background task.

Mirrors scripts/monitor_tvk_handles.py: same env-loading, same direct-DB
process_article path, same free AI chain (Groq -> OpenRouter free ->
Gemini). Cost: $0 (RSS fetches + free-tier AI only).

Usage
-----
    python scripts/ingest_rss.py                 # full loop, 25 items/source
    python scripts/ingest_rss.py --per-source 40 # deeper pull

Env: loads backend/.env if present (local), else reads process env
(GitHub Actions secrets).
"""
from __future__ import annotations
import argparse
import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# Load backend/.env into the environment IF it exists (local runs). On
# GitHub Actions the secrets are already in os.environ, so this is a no-op.
_env = ROOT / "backend" / ".env"
if _env.exists():
    for _line in _env.read_text(encoding="utf-8").splitlines():
        if "=" in _line and not _line.startswith("#"):
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))


async def _main(per_source: int) -> int:
    from app.ingestion.rss_ingest import ingest_all_sources, SOURCES_RSS

    print(f"RSS ingest starting — {len(SOURCES_RSS)} sources, "
          f"{per_source} items/source max (FULL loop, runs to completion)")
    results = await ingest_all_sources(max_items_per_source=per_source)

    total_disc = sum((r.get("discovered") or 0) for r in results)
    total_proc = sum((r.get("processed") or 0) for r in results)
    errors = [r for r in results if r.get("error") or r.get("errors")]
    print(f"\nDone. {len(results)} sources swept | "
          f"{total_disc} items discovered | {total_proc} processed through AI.")
    # Per-source line so GH Actions logs show exactly what ran (proves no
    # source was skipped by a dying task).
    for r in results:
        name = r.get("source", "?")
        if r.get("error"):
            print(f"  [ERR ] {name}: {str(r['error'])[:80]}")
        else:
            print(f"  [ok  ] {name}: discovered={r.get('discovered',0)} "
                  f"processed={r.get('processed',0)}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-source", type=int, default=25,
                    help="Max items pulled per RSS source per run")
    args = ap.parse_args()
    return asyncio.run(_main(args.per_source))


if __name__ == "__main__":
    raise SystemExit(main())
