"""Selective import from tvkfiles.pages.dev — use them as a discovery
mechanism while preserving our trust hierarchy.

Strategy:
  1. Pull their full /api/incidents feed (currently ~631 items)
  2. SKIP wholesale categories that don't match our "concrete event"
     definition: administration, satire-meme, satire, fact-check, reels,
     opinion, news (without specific incident)
  3. SKIP items whose source_url is already in our DB
  4. For each remaining item: convert to ApifyWebhookItem and call our
     normal process_article pipeline. The AI will:
       - reject if not actually an incident
       - extract proper structure
       - tag district + sentiment
       - run promise comparator if from govt source
       - apply the same verification gate as native scrapes
  5. Report: total fetched, skipped-by-category, skipped-as-duplicate,
     processed, accepted-as-incident (visible counts will reflect what
     our AI accepted).

Cost: ~$0.0001 per AI call × ~400 items = ~$0.04. Time: ~10 minutes
with 0.5s polite pacing.

Usage:
    python scripts/import_from_tvkfiles.py --dry-run
    python scripts/import_from_tvkfiles.py
    python scripts/import_from_tvkfiles.py --limit 50
"""
from __future__ import annotations
import argparse
import asyncio
import json
import os
import sys
import time
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
from app.models.schemas import ApifyWebhookItem                       # noqa: E402
from app.ingestion.ai_processor import process_article                # noqa: E402
from app.ingestion.corroboration import _identify_outlet, PRESS_TIERS # noqa: E402


SOURCE_URL = "https://tvkfiles.pages.dev/api/incidents"

# Their categories we DROP wholesale — these don't match our "concrete
# event with named victim/perpetrator/place" definition.  Saves AI calls
# and prevents diluting the dashboard with party-news/memes/opinion.
DROP_CATEGORIES: set[str] = {
    "administration",
    "satire-meme", "satire", "meme",
    "fact-check", "factcheck",
    "reels",
    "opinion", "commentary",
    "news",                    # plain "news" tag without specific incident
}


def _is_drop_category(cat) -> bool:
    """Return True if every category tag is in DROP_CATEGORIES (i.e. nothing
    useful left).  We KEEP items where at least one tag is a real incident
    category (corruption, crime, governance, alcohol-menace etc.)."""
    if not cat:
        return False
    if isinstance(cat, str):
        try:
            cat = json.loads(cat)
        except Exception:
            cat = [cat]
    if not isinstance(cat, list):
        return False
    # Drop only if ALL tags are noise
    return all(str(c).strip().lower() in DROP_CATEGORIES for c in cat)


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


def _existing_urls(db, urls: list[str]) -> set[str]:
    """Return the subset of `urls` already present anywhere in our DB
    (sources table OR incidents.source_urls)."""
    found: set[str] = set()
    # Sources table — chunked .in_()
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


def _infer_tier(url: str, source_type: str | None) -> str:
    """Use our existing outlet identifier to pick a tier; fall back by
    source_type."""
    outlet, tier = _identify_outlet(url, "")
    if tier in PRESS_TIERS and "reddit.com" not in (url or "").lower():
        return tier
    st = (source_type or "").lower()
    if "reddit" in st or "reddit.com" in (url or ""):
        return "social_media"
    if "twitter" in st or "x.com" in (url or ""):
        # x.com URLs from press handles already got picked up above;
        # everything else here is random user tweets
        return "social_media"
    if "instagram" in st:
        return "social_media"
    if "news" in st or "web" in st:
        return "established_press"
    return "social_media"


def _to_webhook_item(row: dict) -> ApifyWebhookItem | None:
    url = row.get("source_url") or row.get("permalink")
    if not url:
        return None
    title = (row.get("title") or "")[:200]
    desc  = (row.get("description") or "").strip()
    self_text = (row.get("selftext") or "").strip()
    # Use whichever body field is more substantial
    body = desc if len(desc) > len(self_text) else (self_text or desc)
    if not title.strip():
        return None
    tier = _infer_tier(url, row.get("source_type"))
    return ApifyWebhookItem(
        url=url,
        title=title,
        text=body[:6000],
        published_at=row.get("published_at") or row.get("created_at") or "",
        source=f"tvkfiles_import_{row.get('source_type') or 'unknown'}",
        tier=tier,
        image_urls=[],
    )


async def run(*, dry_run: bool, limit: int | None) -> None:
    db = get_db()
    print(f"[i] Fetching their feed from {SOURCE_URL}")
    feed = _fetch_their_feed()
    print(f"[i] Got {len(feed)} items from tvkfiles.pages.dev")
    print()

    # Stage 1: category filter
    stage1: list[dict] = []
    by_drop_cat: dict[str, int] = {}
    for row in feed:
        if _is_drop_category(row.get("category")):
            cat = row.get("category") or "?"
            key = str(cat)
            by_drop_cat[key] = by_drop_cat.get(key, 0) + 1
            continue
        stage1.append(row)
    print(f"[i] After category filter: {len(stage1)} (dropped {len(feed) - len(stage1)} noise items)")
    if by_drop_cat:
        print(f"    Dropped by category (top 5):")
        for c, n in sorted(by_drop_cat.items(), key=lambda x: -x[1])[:5]:
            print(f"      {n:3d}  {c[:80]}")
    print()

    # Stage 2: dedup against our DB
    urls = [r.get("source_url") for r in stage1 if r.get("source_url")]
    print(f"[i] Checking {len(urls)} URLs against our sources table...")
    existing = _existing_urls(db, urls)
    stage2 = [r for r in stage1 if r.get("source_url") not in existing]
    print(f"[i] After dedup: {len(stage2)} new items to consider "
          f"({len(stage1) - len(stage2)} already in our DB)")
    print()

    if limit:
        stage2 = stage2[:limit]
        print(f"[i] Limited to first {limit}")
        print()

    if dry_run:
        print(">>> DRY RUN — would process the following (showing first 20):")
        for r in stage2[:20]:
            tier = _infer_tier(r.get("source_url") or "", r.get("source_type"))
            print(f"  [{tier:18s}] {(r.get('title') or '')[:75]}")
            print(f"    {(r.get('source_url') or '')[:100]}")
        print()
        print(f"==== Summary (dry-run) ====")
        print(f"  fetched:     {len(feed)}")
        print(f"  noise dropped: {len(feed) - len(stage1)}")
        print(f"  already in DB: {len(stage1) - len(stage2)}")
        print(f"  would process: {len(stage2)}")
        return

    # Stage 3: actually process
    accepted_or_attempted = 0
    errors = 0
    by_tier_count: dict[str, int] = {}
    for i, row in enumerate(stage2, 1):
        item = _to_webhook_item(row)
        if not item:
            continue
        by_tier_count[item.tier] = by_tier_count.get(item.tier, 0) + 1
        try:
            await process_article(item)
            accepted_or_attempted += 1
            if i % 25 == 0 or i == len(stage2):
                print(f"  [{i:3d}/{len(stage2)}] processed, last: {(item.title or '')[:55]}")
        except Exception as e:
            errors += 1
            print(f"  [err {i}] {(item.url or '')[:60]} :: {e}")
        # Polite pacing — 0.4s between AI calls
        time.sleep(0.4)

    print()
    print(f"==== Summary ====")
    print(f"  fetched from tvkfiles:  {len(feed)}")
    print(f"  noise dropped (cat):    {len(feed) - len(stage1)}")
    print(f"  already in our DB:      {len(stage1) - len(stage2)}")
    print(f"  attempted via pipeline: {accepted_or_attempted}")
    print(f"  pipeline errors:        {errors}")
    print()
    print(f"  By tier:")
    for t, n in sorted(by_tier_count.items(), key=lambda x: -x[1]):
        print(f"    {t:18s} {n}")
    print()
    print(f"Note: of those attempted, the AI processor will have REJECTED")
    print(f"any items it judged 'not_relevant'. Check the latest incident count")
    print(f"on /api/stats/dashboard for the actual net additions.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit",   type=int, default=None, help="Process at most N items")
    args = ap.parse_args()
    asyncio.run(run(dry_run=args.dry_run, limit=args.limit))
