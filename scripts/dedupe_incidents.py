"""Cleanse duplicate incidents — same real-world event ingested multiple
times (different source URLs / different title wordings) that the
URL-only ingestion dedup missed.

Strategy (CONSERVATIVE — never merge genuinely different events):
  Cluster two approved incidents as the SAME event only when they share
  the same category AND one of:
    - title similarity >= 0.72 (clearly the same wording), OR
    - title similarity >= 0.55 AND identical incident_date, OR
    - a strong shared location keyword AND incident_dates within 2 days.

  Within each cluster, KEEP the best copy and reject the rest:
    keeper score = verification_rank*100 + source_count*10
                   + has_location*5 + title_len/20
    verification_rank: multi_source_verified=4, press_verified=3,
                       admin_verified=2, pending=1, retracted=-100
  Losers are set status='rejected' with retraction_reason pointing at the
  keeper — so they appear in the public Corrections log (honest), not
  silently deleted.

Usage:
    python scripts/dedupe_incidents.py --dry-run
    python scripts/dedupe_incidents.py --apply
"""
from __future__ import annotations
import argparse
import difflib
import os
import re
import sys
from datetime import datetime, date
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

VRANK = {"multi_source_verified": 4, "press_verified": 3,
         "admin_verified": 2, "pending_verification": 1, "retracted": -100}
STRONG_KW = ["koyambedu", "கோயம்பேடு", "கொயம்பேடு", "ganja", "கஞ்சா",
             "thirupparankundram", "tirupparankun", "திருப்பரங்குன்றம்",
             "pudukkottai", "புதுக்கோட்டை", "namakkal", "நாமக்கல்"]


def _norm(t: str) -> str:
    return re.sub(r"[^a-z0-9஀-௿]", "", (t or "").lower())


def _pdate(s):
    try:
        return date.fromisoformat((s or "")[:10])
    except Exception:
        return None


def _same_event(a: dict, b: dict) -> bool:
    if (a.get("category") or "") != (b.get("category") or ""):
        return False
    na, nb = _norm(a.get("title")), _norm(b.get("title"))
    if not na or not nb:
        return False
    ratio = difflib.SequenceMatcher(None, na, nb).ratio()
    da, db = _pdate(a.get("incident_date")), _pdate(b.get("incident_date"))
    same_date = da and db and da == db
    near_date = da and db and abs((da - db).days) <= 2
    ta, tb = (a.get("title") or "").lower(), (b.get("title") or "").lower()
    shared_kw = any(k in ta and k in tb for k in STRONG_KW)
    if ratio >= 0.72:
        return True
    if ratio >= 0.55 and same_date:
        return True
    if shared_kw and near_date:
        return True
    return False


def _score(r: dict) -> float:
    vr = VRANK.get(r.get("verification_status") or "", 0)
    return (vr * 100
            + (r.get("source_count") or 0) * 10
            + (5 if r.get("location") else 0)
            + len(r.get("title") or "") / 20)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    apply = args.apply and not args.dry_run

    db = get_db()
    rows = (db.table("incidents")
            .select("id,title,category,location,incident_date,"
                    "verification_status,source_count,created_at")
            .eq("status", "approved").gte("incident_date", "2026-05-11")
            .execute().data or [])

    seen: set[str] = set()
    clusters: list[list[dict]] = []
    for i, a in enumerate(rows):
        if a["id"] in seen:
            continue
        cluster = [a]
        for b in rows[i + 1:]:
            if b["id"] in seen:
                continue
            if _same_event(a, b):
                cluster.append(b)
                seen.add(b["id"])
        if len(cluster) > 1:
            seen.add(a["id"])
            clusters.append(cluster)

    to_reject = []
    for c in clusters:
        c_sorted = sorted(c, key=_score, reverse=True)
        keeper = c_sorted[0]
        for loser in c_sorted[1:]:
            to_reject.append((loser, keeper))

    print(f"Approved incidents scanned: {len(rows)}")
    print(f"Duplicate clusters: {len(clusters)} | rows to reject: {len(to_reject)}\n")
    for c in clusters:
        c_sorted = sorted(c, key=_score, reverse=True)
        print(f"[{c[0].get('category')}]")
        for j, x in enumerate(c_sorted):
            tag = "KEEP " if j == 0 else "  rej"
            print(f"  {tag} {x['incident_date']} src{x.get('source_count')} "
                  f"[{(x.get('verification_status') or '?')[:14]:14}] "
                  f"{(x.get('title') or '')[:50]}")
        print()

    if not apply:
        print("[DRY RUN] Re-run with --apply to reject the duplicates.")
        return 0

    ok = 0
    for loser, keeper in to_reject:
        try:
            db.table("incidents").update({
                "status": "rejected",
                "retracted_at": datetime.now().isoformat(),
                "retraction_reason": (
                    f"Duplicate of incident {keeper['id'][:8]} "
                    f"(\"{(keeper.get('title') or '')[:60]}\") — same event, "
                    f"different source/wording; merged during dedup cleanup."
                ),
            }).eq("id", loser["id"]).execute()
            ok += 1
        except Exception as e:
            print(f"  fail {loser['id'][:8]}: {str(e)[:70]}")
    print(f"\nRejected {ok}/{len(to_reject)} duplicates (kept 1 per cluster). "
          f"They now appear in the public Corrections log.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
