"""Promote direct-imported tvkfiles incidents from pending_review to
approved — EXCEPT ones whose original tvkfiles categories contain soft
tags (satire/meme/opinion/reels/discussion/administration), which stay
pending so commentary never becomes a "verified failure".

Pairs with direct_import_tvkfiles.py. Run it after the import when you
want the imported items to count toward the "Accountability Documented"
widget immediately (admin vouches for the source) rather than waiting
for the overnight AI sweep-verify.

Promoted rows get verification_status='admin_verified' and keep
ai_raw.imported_from='tvkfiles_direct' so the audit trail stays honest:
these came from the reference site at admin direction, NOT independent
pipeline cross-verification.

Usage:
    python scripts/promote_tvkfiles_imports.py --dry-run
    python scripts/promote_tvkfiles_imports.py --apply
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
for _line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in _line and not _line.startswith("#"):
        _k, _, _v = _line.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

from app.database import get_db  # noqa: E402

SOFT = {"satire-meme", "satire", "meme", "opinion", "reels", "reel",
        "discussion", "fact-check", "factcheck", "news", "administration"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    apply = args.apply and not args.dry_run

    db = get_db()
    rows = db.table("incidents").select(
        "id,title,ai_raw,category").eq("status", "pending_review").execute().data or []
    imports = [r for r in rows
               if isinstance(r.get("ai_raw"), dict)
               and r["ai_raw"].get("imported_from") == "tvkfiles_direct"]

    promote, hold = [], []
    for r in imports:
        their = {str(c).lower() for c in (r["ai_raw"].get("their_category") or [])}
        (hold if their & SOFT else promote).append(r)

    print(f"tvkfiles_direct pending imports: {len(imports)}")
    print(f"  promote (hard-only):  {len(promote)}")
    print(f"  hold (soft framing):  {len(hold)}")
    if hold:
        print("\n  Held back:")
        for r in hold:
            cats = ",".join(r["ai_raw"].get("their_category") or [])[:30]
            print(f"    [{cats:30}] {(r['title'] or '')[:42]}")

    if not apply:
        print("\n[DRY RUN] Re-run with --apply to promote.")
        return 0

    ok = 0
    for r in promote:
        try:
            db.table("incidents").update({
                "status": "approved",
                "verification_status": "admin_verified",
            }).eq("id", r["id"]).execute()
            ok += 1
        except Exception as e:
            print(f"  fail {r['id'][:8]}: {str(e)[:80]}")
    print(f"\nPromoted {ok}/{len(promote)} to approved/admin_verified.")
    appr = db.table("incidents").select("id", count="exact").eq(
        "status", "approved").gte("incident_date", "2026-05-11").execute().count
    print(f"Accountability Documented widget now: {appr}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
