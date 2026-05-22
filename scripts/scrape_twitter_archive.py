"""
Scrape historical tweets from a Twitter handle via Apify's
kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest actor
and load DMK-era ones into the dmk_announcements table.

Cost: ~$0.00025 per tweet (works on Apify free tier).

Usage:
    cd backend
    python ../scripts/scrape_twitter_archive.py CMOTamilnadu cmo_tamil_nadu
    python ../scripts/scrape_twitter_archive.py TNDIPR        tn_dipr
"""
import sys
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import settings
from app.database import get_db

APIFY_ACTOR = "kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest"
DMK_START = datetime(2021, 5, 7, tzinfo=timezone.utc)   # Stalin's swearing-in
DMK_END   = datetime(2026, 5, 11, tzinfo=timezone.utc)  # TVK swearing-in cut-off

# Tweet date format from this actor: "Wed Nov 26 14:51:41 +0000 2025"
TWITTER_DATE_FMT = "%a %b %d %H:%M:%S %z %Y"


def trigger_scrape(handle: str, max_items: int) -> str:
    body = {"twitterContent": f"from:{handle}", "maxItems": max_items}
    req = urllib.request.Request(
        f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/runs?token={settings.apify_api_token}",
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=30).read())["data"]["id"]


def wait_for_run(run_id: str, max_seconds: int = 300) -> dict:
    url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={settings.apify_api_token}"
    for i in range(max_seconds // 5):
        d = json.loads(urllib.request.urlopen(url, timeout=15).read())["data"]
        if d["status"] in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            return d
        if i % 4 == 0:
            print(f"  [{i*5}s] {d['status']}")
        time.sleep(5)
    raise SystemExit(f"Run {run_id} did not finish in {max_seconds}s")


def fetch_dataset(dataset_id: str) -> list[dict]:
    url = (
        f"https://api.apify.com/v2/datasets/{dataset_id}/items"
        f"?token={settings.apify_api_token}&limit=5000"
    )
    return json.loads(urllib.request.urlopen(url, timeout=60).read())


def is_dmk_era(created_at: str) -> bool:
    try:
        dt = datetime.strptime(created_at, TWITTER_DATE_FMT)
    except (ValueError, TypeError):
        return False
    return DMK_START <= dt < DMK_END


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    handle = sys.argv[1].lstrip("@")
    source = sys.argv[2]
    if source not in ("cmo_tamil_nadu", "tn_dipr"):
        sys.exit("source must be one of: cmo_tamil_nadu, tn_dipr")

    max_items = int(sys.argv[3]) if len(sys.argv) > 3 else 1500

    print(f"Scraping @{handle} -> source={source}, maxItems={max_items}")
    print(f"  Estimated cost: ${max_items * 0.00025:.2f}")

    run_id = trigger_scrape(handle, max_items)
    print(f"  Run ID: {run_id}")
    print(f"  Console: https://console.apify.com/actors/{APIFY_ACTOR.replace('~','/')}/runs/{run_id}")

    run = wait_for_run(run_id)
    if run["status"] != "SUCCEEDED":
        sys.exit(f"Scrape failed: {run['status']}")
    print(f"  Runtime: {run['stats'].get('runTimeSecs')}s, "
          f"compute units: {run['stats'].get('computeUnits', 0):.4f}")

    items = fetch_dataset(run["defaultDatasetId"])
    print(f"  Raw items: {len(items)}")

    # Filter out mock_tweet noise + keep only DMK-era tweets
    real = [
        t for t in items
        if isinstance(t.get("author"), dict)
        and t.get("createdAt")
        and is_dmk_era(t["createdAt"])
    ]
    print(f"  DMK-era tweets: {len(real)}")

    if not real:
        print("  Nothing to insert.")
        return

    db = get_db()
    inserted = skipped = failed = 0
    for tw in real:
        try:
            dt = datetime.strptime(tw["createdAt"], TWITTER_DATE_FMT)
        except (ValueError, TypeError):
            continue
        tweet_id = str(tw.get("id") or tw.get("tweet_id") or "")
        if not tweet_id or tweet_id == "-1":
            continue

        external_id = f"{source}_{tweet_id}"
        existing = (
            db.table("dmk_announcements")
            .select("id")
            .eq("source", source)
            .eq("external_id", external_id)
            .execute()
        )
        if existing.data:
            skipped += 1
            continue

        author = tw.get("author") or {}
        media = []
        for m in tw.get("media") or []:
            url = m.get("url") or m.get("media_url") or m.get("preview_image_url")
            if url:
                media.append(url)

        title = (tw.get("text") or "")[:200].replace("\n", " ")
        url = (
            tw.get("url")
            or tw.get("twitterUrl")
            or f"https://x.com/{author.get('userName') or handle}/status/{tweet_id}"
        )

        try:
            db.table("dmk_announcements").insert({
                "source": source,
                "source_url": url,
                "external_id": external_id,
                "announcement_date": dt.date().isoformat(),
                "title": title,
                "content": tw.get("text") or "",
                "media_urls": media,
                "tags": [],
                "raw_data": {
                    k: v for k, v in tw.items()
                    if k in ("id", "url", "createdAt", "likeCount", "retweetCount", "viewCount", "lang")
                },
            }).execute()
            inserted += 1
        except Exception as e:
            failed += 1
            if failed <= 3:
                print(f"  FAIL [{title[:50]}]: {e}")

    print(f"\nDone. inserted={inserted}, skipped(dup)={skipped}, failed={failed}")


if __name__ == "__main__":
    main()
