"""
Run the corroboration sweep locally against the production Supabase.

This bypasses the FastAPI auth wall (we have the DB credentials in .env
locally). Useful for the first sweep when the HF Spaces ADMIN_SECRET
isn't easily accessible.

Usage (from project root):
    cd backend
    python ../scripts/run_corroboration_sweep.py                 # all pending in last 45d
    python ../scripts/run_corroboration_sweep.py --limit 30      # cap to 30 for testing
    python ../scripts/run_corroboration_sweep.py --max-age 90    # extend window
"""
import sys, argparse, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.ingestion.corroboration import sweep_pending


def main(max_age: int, limit: int | None):
    print(f"Sweeping pending_verification incidents (max_age={max_age}d, limit={limit or 'no cap'})…")
    start = time.time()
    out = sweep_pending(max_age_days=max_age, limit=limit)
    elapsed = time.time() - start

    print()
    print(f"=== Sweep complete in {elapsed:.1f}s ===")
    print(f"Candidates scanned:    {out['candidates_scanned']}")
    print(f"PROMOTED to verified:  {out['promoted']}")
    print(f"Failed:                {out['failed']}")
    if out['promoted']:
        print(f"Avg outlets/promote:   {out['avg_outlets_per_promote']:.1f}")
    print()
    if out['promoted'] == 0 and out['candidates_scanned'] > 0:
        print("None promoted this run. That's normal if:")
        print("  - Pending incidents are commentary/screenshots without press coverage")
        print("  - The events haven't been picked up by press yet (try again in a week)")
        print("  - The Reddit titles are too vague to query effectively")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-age", type=int, default=45, help="Days lookback")
    ap.add_argument("--limit", type=int, default=None, help="Cap candidates scanned")
    args = ap.parse_args()
    main(max_age=args.max_age, limit=args.limit)
