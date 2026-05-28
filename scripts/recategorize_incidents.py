"""One-shot re-categorisation of existing incidents using the updated
EXTRACTION_PROMPT (which now bans the AI from defaulting to "governance"
and adds defection / youth_targeting / crowd_management_failure as
explicit options).

Pulls incidents by filter (default: category=governance), re-asks Claude
what the right category is given the title + summary + source URLs, and
updates incidents.category in place when the verdict changes.  All
changes are written to incident_audit so you can see what moved where.

If the re-categorisation marks an item as not_relevant (memes, opinion,
celebrity coverage, satire), the script flips status='rejected' so it
disappears from the public dashboard without being permanently deleted.

Usage:
    python scripts/recategorize_incidents.py                       # governance only (default)
    python scripts/recategorize_incidents.py --all                 # all 213 incidents
    python scripts/recategorize_incidents.py --category corruption # arbitrary single category
    python scripts/recategorize_incidents.py --dry-run --all       # report only
    python scripts/recategorize_incidents.py --limit 20            # batch test
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


def _load_env(path: Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env(ROOT / "backend" / ".env")

from app.database import get_db                                       # noqa: E402
from app.ingestion.ai_processor import (                              # noqa: E402
    SYSTEM_PROMPT, EXTRACTION_PROMPT, llm_call_with_fallback,
    _strip_code_fences, _load_dmk_schemes_for_prompt,
)


def _ask_claude(*, url: str, title: str, summary: str, source: str, db) -> dict | None:
    """Run the standard EXTRACTION_PROMPT against an existing incident's
    title+summary (no full article body needed)."""
    schemes_block = _load_dmk_schemes_for_prompt(db)
    prompt = EXTRACTION_PROMPT.format(
        url=url or "",
        source=source or "existing_db_row",
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


def run(*, category: str | None, do_all: bool, dry_run: bool, limit: int | None) -> int:
    db = get_db()
    print(f"[i] Fetching candidates...")
    q = db.table("incidents").select(
        "id, title, summary, category, status, source_urls, severity"
    ).eq("status", "approved")
    if not do_all:
        q = q.eq("category", category or "governance")
    res = q.execute()
    rows = res.data or []
    if limit:
        rows = rows[:limit]
    print(f"[i] {len(rows)} incidents to re-evaluate")
    print()

    stats: dict[str, int] = {
        "unchanged":            0,
        "category_changed":     0,
        "rejected_now":         0,
        "ai_failed":            0,
        "errors":               0,
    }
    movement: dict[tuple[str, str], int] = {}

    for i, row in enumerate(rows, 1):
        old_cat = row.get("category") or "?"
        urls = row.get("source_urls") or []
        verdict = _ask_claude(
            url=(urls[0] if urls else ""),
            title=row.get("title") or "",
            summary=row.get("summary") or "",
            source="db_recategorize",
            db=db,
        )
        if not verdict:
            stats["ai_failed"] += 1
            print(f"  [{i:3d}/{len(rows)}] AI-FAIL {old_cat:18s} :: {(row.get('title') or '')[:55]}")
            time.sleep(0.4)
            continue

        new_cat = verdict.get("category") or old_cat
        is_relevant = verdict.get("is_relevant", True)
        reason = (verdict.get("reason") or "")[:200]

        # If on re-review the AI says this isn't really an incident,
        # demote to rejected (hidden from dashboard).
        if not is_relevant:
            stats["rejected_now"] += 1
            print(f"  [{i:3d}/{len(rows)}] REJECT {old_cat:18s} :: {(row.get('title') or '')[:55]}")
            if not dry_run:
                try:
                    db.table("incidents").update({"status": "rejected"}).eq("id", row["id"]).execute()
                    db.table("incident_audit").insert({
                        "incident_id": row["id"],
                        "action":      "rejected",
                        "actor":       "recategorize-script",
                        "from_value":  old_cat,
                        "to_value":    "rejected",
                        "reason":      f"On re-review with updated prompt: {reason}",
                    }).execute()
                except Exception as e:
                    print(f"      [err] update: {e}")
                    stats["errors"] += 1
            time.sleep(0.4)
            continue

        if new_cat == old_cat:
            stats["unchanged"] += 1
            # quiet — don't spam
            time.sleep(0.4)
            continue

        # Category moved
        stats["category_changed"] += 1
        movement[(old_cat, new_cat)] = movement.get((old_cat, new_cat), 0) + 1
        print(f"  [{i:3d}/{len(rows)}] {old_cat:18s} -> {new_cat:20s} :: {(row.get('title') or '')[:50]}")
        if not dry_run:
            try:
                db.table("incidents").update({"category": new_cat}).eq("id", row["id"]).execute()
                db.table("incident_audit").insert({
                    "incident_id": row["id"],
                    "action":      "category_changed",
                    "actor":       "recategorize-script",
                    "from_value":  old_cat,
                    "to_value":    new_cat,
                    "reason":      f"AI re-categorisation with updated prompt: {reason}",
                }).execute()
            except Exception as e:
                print(f"      [err] update: {e}")
                stats["errors"] += 1
        time.sleep(0.4)

    print()
    print("==== Summary ====")
    print(f"  unchanged:        {stats['unchanged']}")
    print(f"  category_changed: {stats['category_changed']}")
    print(f"  rejected_now:     {stats['rejected_now']}")
    print(f"  ai_failed:        {stats['ai_failed']}")
    print(f"  errors:           {stats['errors']}")
    if movement:
        print()
        print(f"  Top movements (from -> to):")
        for (a, b), n in sorted(movement.items(), key=lambda x: -x[1])[:15]:
            print(f"    {n:3d}  {a:20s} -> {b}")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--category", type=str, default=None,
                    help="Single category to re-evaluate (default: governance)")
    ap.add_argument("--all",      action="store_true",
                    help="Re-evaluate ALL approved incidents")
    ap.add_argument("--dry-run",  action="store_true")
    ap.add_argument("--limit",    type=int, default=None)
    args = ap.parse_args()
    sys.exit(run(category=args.category, do_all=args.all,
                 dry_run=args.dry_run, limit=args.limit))
