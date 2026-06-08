"""Standalone investment-watcher runner (Phase 2 of the registry).

For each active DMK-era commitment in `investment_commitments`, search
Google News for shift/stall/cancel signals and raise a PENDING incident
for human review. Never auto-declares a loss.

Runs the same run_investment_watch() the cron endpoint uses, but to
completion in a real process (GitHub Actions or laptop). Cost: $0 — RSS
fetch + keyword match, no AI call.

Usage:
    python scripts/investment_watch.py
    python scripts/investment_watch.py --max 40

Env: loads backend/.env if present (local), else reads process env
(GitHub Actions secrets).
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


def main(max_companies: int) -> int:
    from app.ingestion.investment_watcher import run_investment_watch
    print(f"Investment watch starting — up to {max_companies} active commitments")
    res = run_investment_watch(max_companies=max_companies)
    print(f"Done. checked={res.get('checked')} flagged={res.get('flagged')}")
    if res.get("flagged"):
        print(f"  -> {res['flagged']} commitment(s) flagged as pending_review for your check.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=40, help="Max commitments to check")
    args = ap.parse_args()
    raise SystemExit(main(args.max))
