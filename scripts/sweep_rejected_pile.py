"""Sweep the rejected-pile against the updated EXTRACTION_PROMPT.

Background: the user kept catching real TN-context events that had been
mis-rejected during early ingestion when the prompt didn't yet have:
  - language_imposition (Hindi push)
  - dravidian_attack (Periyar/Self-Respect attacks)
  - federalism (Centre-State conflict)
  - drug_menace (ganja/MD corridor)
  - communal_violence covering caste discrimination
  - industrial_flight (Royal Enfield, AMCA, Parandur)

The recategorize_incidents.py script only looks at status='approved' rows
(it remaps categories), so it never touched the 249 rows in the rejected
pile.  This script does — with conservative gates so we only resurrect
clear misclassifications, not noise (TASMAC strikes, opinion pieces,
celebrity coverage, satire are still genuinely irrelevant).

Resurrection rules:
  1. AI must mark is_relevant=True
  2. ai_confidence >= 0.75
  3. NEW category must be one of TARGET_BUCKETS (the TN-specific
     accountability lanes the user keeps catching gaps in)
  4. Or new category != old AND old was 'governance' (catch-all bucket
     that absorbed too much) AND new is in a meaningful crime/policy
     bucket.

Resurrected rows:
  status: rejected -> approved
  category: updated to AI's new pick
  verification_status: stays as it was (no upgrade to multi_source here)

Audit log entry written for every change.

Usage:
    python scripts/sweep_rejected_pile.py --dry-run
    python scripts/sweep_rejected_pile.py             # actually resurrect
    python scripts/sweep_rejected_pile.py --limit 40  # batch test
    python scripts/sweep_rejected_pile.py --category governance  # subset
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from app.database import get_db                                       # noqa: E402
from app.ingestion.ai_processor import (                              # noqa: E402
    SYSTEM_PROMPT, EXTRACTION_PROMPT, llm_call_with_fallback,
    _strip_code_fences, _load_dmk_schemes_for_prompt,
)

# Categories we PRIORITY-resurrect — these are the TN-specific lanes the
# user has been catching gaps in, and the post-update prompt now routes
# to them correctly.
TARGET_BUCKETS = {
    "language_imposition",
    "dravidian_attack",
    "federalism",
    "drug_menace",
    "communal_violence",
    "industrial_flight",
    "credit_stealing",
    "broken_promise",
    "kept_promise",
    "partial_promise",
    "defection",
    "honour_killing",
    "custodial_death",
    "attack_on_press",
    "censorship",
    "crowd_management_failure",
    "youth_targeting",
}

# Always-resurrect buckets (concrete crimes / power failures / etc) — if
# the AI now says one of these is the right primary category, we trust
# it regardless of the old category.
CONCRETE_BUCKETS = {
    "murders",
    "sexual_assault",
    "crimes_women_kids",
    "police_excess",
    "corruption",
    "power_cut",
    "eb_failure",
    "civic_failure",
    "tenders",
}


def _ask_claude(*, url: str, title: str, summary: str, db) -> dict | None:
    schemes_block = _load_dmk_schemes_for_prompt(db)
    prompt = EXTRACTION_PROMPT.format(
        url=url or "",
        source="db_resurrect_sweep",
        published=date.today().isoformat(),
        title=title or "",
        text=summary or "",
        dmk_schemes=schemes_block,
        today=date.today().isoformat(),
    )
    try:
        raw = llm_call_with_fallback(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=600,
        )
        if not raw:
            return None
        return json.loads(_strip_code_fences(raw))
    except Exception as e:
        print(f"      [err] AI call: {type(e).__name__}: {str(e)[:90]}")
        return None


def _should_resurrect(old_cat: str, verdict: dict) -> tuple[bool, str]:
    """Return (resurrect?, reason)."""
    if not verdict.get("is_relevant"):
        return False, "AI still says not relevant"
    conf = float(verdict.get("confidence") or 0)
    if conf < 0.75:
        return False, f"AI confidence too low ({conf:.2f})"
    new_cat = verdict.get("category") or ""
    if new_cat in TARGET_BUCKETS:
        return True, f"matches TN-priority bucket: {new_cat}"
    if new_cat in CONCRETE_BUCKETS and new_cat != old_cat:
        return True, f"AI re-tagged as concrete bucket: {new_cat}"
    if new_cat in CONCRETE_BUCKETS and old_cat == "governance":
        return True, f"governance catch-all -> {new_cat}"
    return False, f"new_cat={new_cat} not in priority buckets"


def run(*, category: str | None, dry_run: bool, limit: int | None) -> int:
    db = get_db()
    print(f"[i] Fetching REJECTED candidates...")
    q = db.table("incidents").select(
        "id, title, summary, category, source_urls, severity, verification_status"
    ).eq("status", "rejected")
    if category:
        q = q.eq("category", category)
    res = q.execute()
    rows = res.data or []
    if limit:
        rows = rows[:limit]
    print(f"[i] {len(rows)} rejected incidents to evaluate")
    print()

    stats: dict[str, int] = {
        "resurrected":  0,
        "kept_rejected": 0,
        "ai_failed":    0,
        "errors":       0,
    }
    resurrect_log: list[tuple[str, str, str]] = []  # (id, old_cat, new_cat)

    for i, row in enumerate(rows, 1):
        old_cat = row.get("category") or "?"
        urls = row.get("source_urls") or []
        title = row.get("title") or ""
        verdict = _ask_claude(
            url=(urls[0] if urls else ""),
            title=title,
            summary=row.get("summary") or "",
            db=db,
        )
        if not verdict:
            stats["ai_failed"] += 1
            print(f"  [{i:3d}/{len(rows)}] AI-FAIL {old_cat:18s} :: {title[:55]}")
            time.sleep(0.4)
            continue

        should, why = _should_resurrect(old_cat, verdict)
        if not should:
            stats["kept_rejected"] += 1
            time.sleep(0.4)
            continue

        new_cat = verdict.get("category")
        reason = (verdict.get("reason") or "")[:200]
        stats["resurrected"] += 1
        resurrect_log.append((row["id"], old_cat, new_cat))
        print(f"  [{i:3d}/{len(rows)}] RESURRECT {old_cat:18s} -> {new_cat:20s} :: {title[:50]}")
        print(f"        why: {why}")

        if not dry_run:
            try:
                db.table("incidents").update({
                    "category":   new_cat,
                    "status":     "approved",
                }).eq("id", row["id"]).execute()
                db.table("incident_audit").insert({
                    "incident_id": row["id"],
                    "action":      "resurrected",
                    "actor":       "rejected-sweep-script",
                    "from_value":  f"rejected/{old_cat}",
                    "to_value":    f"approved/{new_cat}",
                    "reason":      f"Resurrected by sweep ({why}). AI rationale: {reason}",
                }).execute()
            except Exception as e:
                print(f"      [err] update: {e}")
                stats["errors"] += 1
        time.sleep(0.4)

    print()
    print("==== Sweep summary ====")
    print(f"  resurrected:    {stats['resurrected']}")
    print(f"  kept rejected:  {stats['kept_rejected']}")
    print(f"  ai_failed:      {stats['ai_failed']}")
    print(f"  errors:         {stats['errors']}")
    if resurrect_log:
        print()
        print(f"  Categories resurrected into:")
        from collections import Counter
        moves = Counter((old, new) for _, old, new in resurrect_log)
        for (old, new), n in moves.most_common():
            print(f"    {n:3d}  {old:20s} -> {new}")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--category", type=str, default=None,
                    help="Only sweep this rejected-category (default: all)")
    ap.add_argument("--dry-run",  action="store_true")
    ap.add_argument("--limit",    type=int, default=None)
    args = ap.parse_args()
    sys.exit(run(category=args.category, dry_run=args.dry_run, limit=args.limit))
