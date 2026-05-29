"""Proactive promise audit — two modes:

  1. --deadline-pass     Scan pending promises whose deadline has passed
                          and flip them to 'broken' (auto-broken by time).
                          Daily cron candidate.

  2. --manifesto-coverage Fetch the TVK manifesto and ask Claude to list
                          every distinct pledge.  Diff against our 392
                          existing promises and report what's missing,
                          so we can seed the gaps (Singappen-style).

  3. --retro-comparator   Run the Promise Comparator over EVERY existing
                          post-May-11 incident whose summary mentions a
                          scheme/promise keyword.  Catches manifesto
                          dilutions that the original ingestion missed
                          because the comparator wasn't firing on press.

Default (no flags): runs --deadline-pass.  Pick the mode you need.

Usage:
    python scripts/audit_promises.py --deadline-pass
    python scripts/audit_promises.py --manifesto-coverage
    python scripts/audit_promises.py --retro-comparator
    python scripts/audit_promises.py --retro-comparator --dry-run
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import time
from datetime import date, datetime, timezone
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
from app.ingestion.ai_processor import llm_call_with_fallback, _strip_code_fences  # noqa: E402
from app.ingestion.promise_comparator import compare_to_manifesto     # noqa: E402


# ============================================================================
# 1. DEADLINE-PASS
# ============================================================================

def deadline_pass(*, dry_run: bool) -> None:
    """Mark pending promises broken when their deadline has lapsed."""
    db = get_db()
    today = date.today().isoformat()
    res = (
        db.table("promises")
        .select("id, text, deadline, status, notes")
        .eq("status", "pending")
        .lt("deadline", today)
        .execute()
    )
    rows = res.data or []
    print(f"[i] {len(rows)} pending promises past deadline")
    moved = 0
    for r in rows:
        snippet = (r.get("text") or "")[:75]
        print(f"  [{r.get('deadline')}] {snippet}")
        if dry_run:
            continue
        try:
            note_addition = (
                f"[auto: broken-by-deadline {today}] Deadline passed without "
                f"verifiable evidence of delivery. Status auto-flipped pending -> broken."
            )
            merged = ((r.get("notes") or "") + "\n\n" + note_addition).strip()
            db.table("promises").update({
                "status": "broken",
                "notes":  merged[:2000],
            }).eq("id", r["id"]).execute()
            moved += 1
        except Exception as e:
            print(f"      [err] {e}")
    print()
    print(f"==== Summary ====")
    print(f"  past_deadline_pending: {len(rows)}")
    print(f"  flipped to broken:     {moved}")


# ============================================================================
# 2. MANIFESTO COVERAGE
# ============================================================================

MANIFESTO_PROMPT = """You are auditing TVK's 2026 election manifesto against
a list of promises already captured in the accountability dashboard.

Existing promise topics (short list — these are already captured, do NOT
re-suggest them):
{existing_topics}

The TVK manifesto is at https://tvkvijay.com/en/manifesto and covers:
  - Agriculture and farmer welfare
  - Women's safety, welfare, and economic empowerment
  - Youth, education, scholarships
  - Industrial development, MSMEs, employment
  - Healthcare and hospitals
  - Infrastructure (transport, power, water, urban)
  - Social justice and minority welfare
  - Fisheries
  - Tribal communities
  - Senior citizens, differently-abled
  - Sanitation, environment
  - Cultural / language

Based on widely-known TVK manifesto highlights (which include but are not
limited to Singappen Athirai Padai, Magalir Urimai Thogai, Vetri Kapadu
scholarship, Vetri Karuvool MSME scheme, Vandhe Vetri pension, plus
sector-wide reforms), list ANY notable manifesto pledges that DO NOT
appear in the existing-topics list above.

Reply with ONLY a JSON object:
  {{
    "missing_pledges": [
      {{
        "name":      "Short scheme/policy name",
        "summary":   "1-2 sentence description of what was promised",
        "category":  "women|farmers|youth|industry|health|education|infrastructure|welfare|social_justice|other",
        "deadline_hint": "first 100 days | first year | within term | unspecified"
      }}
    ]
  }}

Cap at 15 entries.  If you genuinely don't know of any missing,
return an empty list.  Do NOT invent pledges that aren't in the
manifesto."""


def manifesto_coverage(*, dry_run: bool) -> None:
    db = get_db()
    res = db.table("promises").select("text, category").execute()
    rows = res.data or []
    existing_topics = sorted({
        (r.get("text") or "")[:60].rsplit(" ", 1)[0] for r in rows if r.get("text")
    })
    # Trim to keep prompt size reasonable
    if len(existing_topics) > 60:
        existing_topics = existing_topics[:60] + ["...(and more)"]
    prompt = MANIFESTO_PROMPT.format(existing_topics="\n  - " + "\n  - ".join(existing_topics))

    print(f"[i] Asking AI for manifesto gaps...")
    raw = llm_call_with_fallback(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2000,
    )
    if not raw:
        print("[x] AI call failed")
        return
    try:
        verdict = json.loads(_strip_code_fences(raw))
        missing = verdict.get("missing_pledges") or []
    except Exception as e:
        print(f"[x] Parse failed: {e}")
        return

    print(f"[i] AI suggested {len(missing)} potentially-missing pledges:")
    print()
    for m in missing:
        print(f"  • {m.get('name','?'):<35s} [{m.get('category','?'):<15s}]  {m.get('deadline_hint','?')}")
        print(f"    {m.get('summary','')[:140]}")
        print()

    if dry_run:
        return

    print(f"[i] Seeding {len(missing)} potentially-missing pledges as status=pending...")
    inserted = 0
    for m in missing:
        try:
            # Skip if a similar promise already exists
            name = (m.get("name") or "").strip()
            if not name:
                continue
            existing = (
                db.table("promises").select("id")
                .ilike("text", f"%{name[:30]}%")
                .limit(1).execute()
            )
            if existing.data:
                print(f"  [skip] already on file: {name}")
                continue
            payload = {
                "text": f"{name} — {m.get('summary','')}",
                "category": m.get("category") or "other",
                "made_date": "2026-04-15",
                "deadline":  "2026-12-31",
                "status":    "pending",
                "source":    "manifesto",
                "evidence_url": "https://tvkvijay.com/en/manifesto",
                "notes":     f"Auto-added by manifesto coverage audit. Source: AI-recognised manifesto highlight. Verify against actual manifesto PDF.",
            }
            db.table("promises").insert(payload).execute()
            inserted += 1
            print(f"  [OK] inserted: {name}")
        except Exception as e:
            print(f"  [err] {name}: {e}")
    print()
    print(f"==== Summary ====")
    print(f"  AI suggested:  {len(missing)}")
    print(f"  newly added:   {inserted}")


# ============================================================================
# 3. RETRO COMPARATOR — apply the now-extended comparator to existing rows
# ============================================================================

def retro_comparator(*, dry_run: bool, limit: int | None) -> None:
    """Re-run the comparator over EVERY existing post-May-11 incident
    that has scheme/promise keywords — catches matches that the
    original ingestion missed (because the old code only fired
    comparator for tier=govt_announcement)."""
    db = get_db()
    res = (
        db.table("incidents")
        .select("id, title, summary, category, location, incident_date, source_urls")
        .eq("status", "approved")
        .gte("incident_date", "2026-05-11")
        .execute()
    )
    rows = res.data or []
    keywords = ("scheme", "manifesto", "promise", "waiver", "padai",
                "thittam", "thogai", "magalir", "singappen", "loan",
                "subsidy", "free bus", "assistance", "rupees", "rs")

    def relevant(r):
        s = ((r.get("title") or "") + " " + (r.get("summary") or "")).lower()
        return any(k in s for k in keywords)

    candidates = [r for r in rows if relevant(r)]
    print(f"[i] {len(candidates)} of {len(rows)} incidents mention a scheme/promise keyword")
    if limit:
        candidates = candidates[:limit]
        print(f"[i] Limited to first {limit}")
    print()

    matched = 0
    no_match = 0
    for i, inc in enumerate(candidates, 1):
        urls = inc.get("source_urls") or []
        url = urls[0] if urls else ""
        try:
            v = compare_to_manifesto(
                title=inc.get("title") or "",
                summary=inc.get("summary") or "",
                category=inc.get("category") or "",
                location=inc.get("location"),
                date=inc.get("incident_date") or date.today().isoformat(),
                announcement_url=url,
            )
        except Exception as e:
            print(f"  [err {i}] {e}")
            continue

        if not v:
            no_match += 1
            continue

        vd = v.get("verdict")
        pid = v.get("best_match_promise_id")
        conf = float(v.get("confidence") or 0)
        if vd in ("fulfilled", "partial", "broken") and pid and conf >= 0.7:
            matched += 1
            print(f"  [{i:3d}/{len(candidates)}] {vd:9s} (conf {conf:.2f}) :: {(inc.get('title') or '')[:55]}")
            print(f"      gap: {(v.get('gap_summary') or '')[:120]}")
        else:
            no_match += 1

        time.sleep(0.3)

    print()
    print(f"==== Summary ====")
    print(f"  candidates checked: {len(candidates)}")
    print(f"  high-conf matches:  {matched}  (promise status updated by comparator)")
    print(f"  no useful match:    {no_match}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--deadline-pass",       action="store_true", help="Auto-broken stale pending promises")
    ap.add_argument("--manifesto-coverage",  action="store_true", help="AI audit for missing pledges")
    ap.add_argument("--retro-comparator",    action="store_true", help="Run comparator over existing incidents")
    ap.add_argument("--dry-run",             action="store_true")
    ap.add_argument("--limit",               type=int, default=None)
    args = ap.parse_args()

    if not any((args.deadline_pass, args.manifesto_coverage, args.retro_comparator)):
        args.deadline_pass = True   # default

    if args.dry_run:
        print(">>> DRY RUN — no writes\n")
    if args.deadline_pass:
        print("=== DEADLINE-PASS ===")
        deadline_pass(dry_run=args.dry_run)
        print()
    if args.manifesto_coverage:
        print("=== MANIFESTO COVERAGE ===")
        manifesto_coverage(dry_run=args.dry_run)
        print()
    if args.retro_comparator:
        print("=== RETRO COMPARATOR ===")
        retro_comparator(dry_run=args.dry_run, limit=args.limit)
        print()
