"""Direct (no-AI) structured import from tvkfiles.pages.dev.

Used when our AI budget is exhausted but we still need to close the
freshness gap vs the reference tracker. Unlike import_from_tvkfiles.py
(which runs every item through our full AI pipeline), this maps their
ALREADY-STRUCTURED fields straight into our schema and lands rows as
status=pending_review / verification_status=pending_verification — so
they're visible immediately but clearly flagged for later AI/human
verification, never silently trusted as approved.

Guardrails (so this stays "discovery", not "trust-clone"):
  - RECENT ONLY: incident_date within --days (default 4) — closes the
    freshness gap, doesn't bulk-mirror their whole backlog.
  - HARD CATEGORIES ONLY: an item must carry at least one concrete
    incident category (murder, assault, corruption, police, eb-failure,
    civic-fail, etc.). Pure satire/opinion/reels/discussion/admin/
    governance-only items are dropped.
  - DEDUP: against our existing source_urls, tweet-ids, and normalized
    titles, plus within the batch itself.
  - PENDING: every row lands pending_review with ai_raw.imported_from
    = 'tvkfiles_direct' so a later AI sweep (or human) re-verifies it.

Usage:
    python scripts/direct_import_tvkfiles.py --dry-run
    python scripts/direct_import_tvkfiles.py --apply
    python scripts/direct_import_tvkfiles.py --apply --days 4
"""
from __future__ import annotations
import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone, date
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

SOURCE_URL = "https://tvkfiles.pages.dev/api/incidents"
GOVT_START = date(2026, 5, 11)

# Their category vocab → our category vocab. Checked in priority order;
# first hard match wins. Items with NO hard match are dropped.
HARD_PRIORITY = [
    ("murders",        "murders"),
    ("custodial",      "custodial_death"),
    ("honour",         "honour_killing"),
    ("children",       "crimes_women_kids"),
    ("women",          "sexual_assault"),
    ("assaults",       "crimes_women_kids"),
    ("police",         "police_excess"),
    ("corruption",     "corruption"),
    ("tender",         "tenders"),
    ("eb-failure",     "eb_failure"),
    ("power",          "power_cut"),
    ("water",          "water_shortage"),
    ("alcohol-menace", "alcohol_menace"),
    ("drug",           "drug_menace"),
    ("poll-prom",      "broken_promise"),
    ("communal",       "communal_violence"),
    ("dravidian",      "dravidian_attack"),
    ("press",          "attack_on_press"),
    ("censor",         "censorship"),
    ("civic-fail",     "civic_failure"),
    ("crime",          "crime_law"),
    ("law-order",      "crime_law"),
    ("violence",       "crime_law"),
]
HARD_KEYS = {k for k, _ in HARD_PRIORITY}
SOFT_ONLY_DROP = {"satire-meme", "satire", "meme", "opinion", "reels",
                  "discussion", "fact-check", "factcheck", "news",
                  "administration", "reel"}


def _cats(it) -> list[str]:
    c = it.get("category")
    if isinstance(c, str):
        try:
            c = json.loads(c)
        except Exception:
            c = [c]
    return [str(x).lower().strip() for x in (c or [])]


def _map_category(cats: list[str]) -> str | None:
    cset = set(cats)
    for key, ours in HARD_PRIORITY:
        if key in cset:
            return ours
    return None  # no hard category → drop


def _clamp_sev(v) -> int:
    try:
        n = int(v)
    except Exception:
        return 3
    return max(1, min(5, n))


def _pdate(s) -> date | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00")).date()
    except Exception:
        try:
            return datetime.fromisoformat(str(s)[:10]).date()
        except Exception:
            return None


def _norm_title(t) -> str:
    return re.sub(r"[^a-z0-9஀-௿]", "", (t or "").lower())[:40]


def _event_sig(category, location, incident_date) -> str:
    loc = re.sub(r"[^a-z0-9]+", "", (location or "").lower())[:30]
    return f"{(category or '').lower()}:{loc}:{incident_date or ''}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=4,
                    help="Import items whose incident_date is within N days")
    ap.add_argument("--apply", action="store_true",
                    help="Actually insert (default is dry-run)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    apply = args.apply and not args.dry_run

    db = get_db()
    today = datetime.now(timezone.utc).date()
    cutoff = today.toordinal() - args.days

    # Fetch theirs
    req = urllib.request.Request(SOURCE_URL, headers={
        "User-Agent": "Mozilla/5.0", "Referer": "https://tvkfiles.pages.dev/"})
    theirs = json.loads(urllib.request.urlopen(req, timeout=60).read())
    theirs = theirs if isinstance(theirs, list) else theirs.get("incidents", [])

    # Build dedup sets from our DB
    ours = db.table("incidents").select("title,source_urls").execute().data or []
    our_urls, our_tids, our_titles = set(), set(), set()
    for o in ours:
        for u in (o.get("source_urls") or []):
            if u:
                u2 = u.split("?")[0]
                our_urls.add(u2)
                m = re.search(r"(\d{15,})", u2)
                if m:
                    our_tids.add(m.group(1))
        our_titles.add(_norm_title(o.get("title")))

    stats = {"total": len(theirs), "old": 0, "no_hard_cat": 0,
             "pre_govt": 0, "dup": 0, "batch_dup": 0, "to_insert": 0}
    seen_batch = set()
    to_insert = []

    for it in theirs:
        idate = _pdate(it.get("published_at") or it.get("created_at"))
        if not idate or idate.toordinal() < cutoff:
            stats["old"] += 1
            continue
        if idate < GOVT_START:
            stats["pre_govt"] += 1
            continue
        cats = _cats(it)
        category = _map_category(cats)
        if not category:
            stats["no_hard_cat"] += 1
            continue
        # Dedup vs our DB
        url = (it.get("source_url") or "").split("?")[0]
        tid = ""
        m = re.search(r"(\d{15,})", url)
        if m:
            tid = m.group(1)
        ntitle = _norm_title(it.get("title"))
        if (url and url in our_urls) or (tid and tid in our_tids) or (ntitle and ntitle in our_titles):
            stats["dup"] += 1
            continue
        # Dedup within batch
        bkey = tid or ntitle
        if bkey in seen_batch:
            stats["batch_dup"] += 1
            continue
        seen_batch.add(bkey)

        title = (it.get("title") or "").strip()[:200]
        summary = (it.get("description") or it.get("title") or "").strip()[:2000]
        d_raw = it.get("district")
        if isinstance(d_raw, dict):
            district = d_raw.get("name") or None
        elif isinstance(d_raw, str):
            district = d_raw or None
        else:
            district = None
        payload = {
            "title": title,
            "summary": summary,
            "category": category,
            "incident_date": idate.isoformat(),
            "location": district,
            "district": district,
            "severity": _clamp_sev(it.get("severity")),
            "ai_confidence": 0.5,
            "status": "pending_review",
            "verification_status": "pending_verification",
            "source_urls": [it.get("source_url")] if it.get("source_url") else [],
            "source_count": 1,
            "is_credit_steal": False,
            "image_urls": [],
            "member_ids": [],
            "event_signature": _event_sig(category, district, idate.isoformat()),
            "ai_raw": {
                "imported_from": "tvkfiles_direct",
                "their_id": it.get("id"),
                "their_category": cats,
                "their_severity": it.get("severity"),
                "import_note": "Direct structured import (no AI) to close freshness gap; "
                               "verify via AI sweep or human review.",
                "imported_at": datetime.now(timezone.utc).isoformat(),
            },
        }
        to_insert.append((payload, cats))

    stats["to_insert"] = len(to_insert)
    print("=== tvkfiles DIRECT import (no AI) ===")
    print(f"  their feed:            {stats['total']}")
    print(f"  older than {args.days}d:        {stats['old']}")
    print(f"  pre-May-11:            {stats['pre_govt']}")
    print(f"  no hard category:      {stats['no_hard_cat']}")
    print(f"  duplicate (in our DB): {stats['dup']}")
    print(f"  duplicate (in batch):  {stats['batch_dup']}")
    print(f"  --> WILL INSERT:       {stats['to_insert']}")
    print()
    from collections import Counter
    cc = Counter(p["category"] for p, _ in to_insert)
    print("  By category:")
    for c, n in cc.most_common():
        print(f"     {c:24} {n}")
    print()
    print("  Items:")
    for p, cats in to_insert:
        print(f"     {p['incident_date']} [{p['category']:18}] sev{p['severity']} {p['title'][:46]}")

    if not apply:
        print("\n[DRY RUN] Nothing inserted. Re-run with --apply to insert.")
        return 0

    print(f"\nInserting {len(to_insert)} rows...")
    ok = 0
    for p, _ in to_insert:
        try:
            r = db.table("incidents").insert(p).execute()
            if r.data:
                ok += 1
        except Exception as e:
            print(f"  insert failed ({p['title'][:30]}): {str(e)[:100]}")
    print(f"Inserted {ok}/{len(to_insert)} as pending_review.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
