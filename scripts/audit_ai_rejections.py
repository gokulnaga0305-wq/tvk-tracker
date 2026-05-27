"""Audit what our AI relevance filter is rejecting from tvkfiles imports.

Pulls a random sample of their items we haven't ingested, runs each
through our Claude extractor in ANALYZE-ONLY mode (no DB writes), and
prints the verdict side-by-side so you can spot:

  - false rejects: real incidents we wrongly skipped
  - true rejects: opinion / sarcasm / commentary we correctly filtered
  - borderline cases: items we might want to loosen the filter for

Output is sorted so you see the rejections first, then accepted items
for contrast.

Usage:
    python scripts/audit_ai_rejections.py --sample 20
    python scripts/audit_ai_rejections.py --sample 30 --seed 42
"""
from __future__ import annotations
import argparse
import json
import os
import random
import sys
import urllib.request
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
from app.ingestion.ai_processor import analyze_only                   # noqa: E402


SOURCE_URL = "https://tvkfiles.pages.dev/api/incidents"

# Same drop-set as the importer so we're auditing the same items the
# real pipeline would consider.
DROP_CATEGORIES: set[str] = {
    "administration", "satire-meme", "satire", "meme",
    "fact-check", "factcheck", "reels",
    "opinion", "commentary", "news",
}


def _fetch_their_feed() -> list[dict]:
    req = urllib.request.Request(
        SOURCE_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36",
            "Accept": "application/json",
            "Referer": "https://tvkfiles.pages.dev/",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    return data.get("incidents") or []


def _is_drop_category(cat) -> bool:
    if not cat:
        return False
    if isinstance(cat, str):
        try: cat = json.loads(cat)
        except Exception: cat = [cat]
    if not isinstance(cat, list):
        return False
    return all(str(c).strip().lower() in DROP_CATEGORIES for c in cat)


def _existing_urls(db, urls: list[str]) -> set[str]:
    found: set[str] = set()
    for start in range(0, len(urls), 50):
        chunk = urls[start:start + 50]
        try:
            res = db.table("sources").select("url").in_("url", chunk).execute()
            for row in (res.data or []):
                if row.get("url"):
                    found.add(row["url"])
        except Exception:
            pass
    return found


def main(*, sample: int, seed: int) -> None:
    db = get_db()
    print(f"[i] Fetching their feed...")
    feed = _fetch_their_feed()
    print(f"[i] Total: {len(feed)}, after category-drop + dedup picking a random {sample}-item sample (seed={seed})")
    print()

    # Filter to candidates we haven't ingested + not dropped-category
    candidates = [r for r in feed if not _is_drop_category(r.get("category"))]
    urls = [r.get("source_url") for r in candidates if r.get("source_url")]
    existing = _existing_urls(db, urls)
    candidates = [r for r in candidates if r.get("source_url") not in existing]
    print(f"[i] {len(candidates)} eligible candidates")
    if not candidates:
        return

    random.seed(seed)
    sample_items = random.sample(candidates, min(sample, len(candidates)))

    rejected: list[tuple[dict, dict]] = []
    accepted: list[tuple[dict, dict]] = []
    errors:   list[tuple[dict, str]]  = []

    for i, row in enumerate(sample_items, 1):
        url = row.get("source_url") or ""
        title = (row.get("title") or "")[:120]
        body = (row.get("description") or row.get("selftext") or "")[:3000]
        source = row.get("source_type") or "?"

        print(f"  [{i}/{len(sample_items)}] judging...", end=" ", flush=True)
        try:
            verdict = analyze_only(
                url=url,
                source=f"tvkfiles_{source}",
                title=title,
                text=body,
            )
        except Exception as e:
            errors.append((row, str(e)))
            print(f"ERR: {type(e).__name__}")
            continue

        if verdict.get("is_relevant"):
            accepted.append((row, verdict))
            print("ACCEPT")
        else:
            rejected.append((row, verdict))
            print("REJECT")

    print()
    print("=" * 100)
    print(f"==== REJECTED ({len(rejected)}) ====")
    print("=" * 100)
    for row, v in rejected:
        title = row.get("title", "")
        cat = row.get("category", "")
        print()
        print(f"  TVK SAYS:   {title[:120]}")
        print(f"  cat={cat} src={row.get('source_type')}")
        print(f"  URL: {row.get('source_url', '')[:100]}")
        print(f"  AI REASON: {v.get('reason', '(none)')[:200]}")
        if v.get('category'):
            print(f"  AI would have tagged: {v.get('category')}  confidence={v.get('confidence')}")

    print()
    print("=" * 100)
    print(f"==== ACCEPTED ({len(accepted)}) — for contrast ====")
    print("=" * 100)
    for row, v in accepted:
        title = row.get("title", "")
        print()
        print(f"  TVK SAYS:   {title[:120]}")
        print(f"  URL:        {row.get('source_url', '')[:100]}")
        print(f"  AI ACCEPTS as: {v.get('category')}  severity={v.get('severity')}  confidence={v.get('confidence')}")
        print(f"  AI title:   {(v.get('title') or '')[:120]}")

    if errors:
        print()
        print(f"==== ERRORS ({len(errors)}) ====")
        for row, e in errors:
            print(f"  {(row.get('title') or '')[:80]}: {e[:150]}")

    print()
    print(f"SUMMARY: {len(rejected)}/{len(sample_items)} rejected ({100*len(rejected)/len(sample_items):.0f}%)")
    if rejected:
        print("Review the REJECTED list and tell me which ones (if any) should have been accepted.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=20)
    ap.add_argument("--seed",   type=int, default=7)
    args = ap.parse_args()
    main(sample=args.sample, seed=args.seed)
