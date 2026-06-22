"""Standalone tweet-watch poller.

Polls the public Nitter RSS for watched DMK-defense / fact-check handles
(@saysatheesh et al.), dedups by tweet id, and inserts new tweets into the
`tweet_watch` review queue — flagging credit-steal / fact-check candidates.
Promotion to an actual incident is a separate, human-verified step.

Usage:
    python scripts/scrape_tweet_watch.py
    python scripts/scrape_tweet_watch.py --handles saysatheesh,dstock_insights

Env: loads backend/.env if present (local), else process env (GH secrets).
Needs SUPABASE_* only. Requires migration 024_tweet_watch.sql to be applied.
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


def main(handles) -> int:
    from app.ingestion.tweet_watch import poll_watchlist, WATCHLIST
    hs = handles or WATCHLIST
    print(f"Tweet-watch poll starting — handles={hs}")
    counts = poll_watchlist(hs)
    print(f"Done: {counts}")
    if counts.get("candidates"):
        print(f"  ⚑ {counts['candidates']} credit-steal/fact CANDIDATE(s) queued for review "
              f"(tweet_watch where is_candidate=true and status='new').")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--handles", type=str, default="", help="comma-separated handles override")
    args = ap.parse_args()
    hs = [h.strip() for h in args.handles.split(",") if h.strip()] or None
    raise SystemExit(main(hs))
