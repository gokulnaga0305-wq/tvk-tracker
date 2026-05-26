import sys as _sys
try:
    _sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

"""
Live TVK monitor — pulls recent tweets from TVK official handles, runs each
through the AI ingestion pipeline, and (thanks to the live-corroboration
hook in ai_processor) instantly tries to verify via Google News + DMK archive.

This is the rapid-response loop for a DMK fact-checker. When TVK posts a
credit-steal claim, the dashboard knows within minutes — not tomorrow.

Pipeline per tweet:
  1. Apify Twitter scraper pulls tweets newer than HOURS_BACK
  2. Each tweet → ApifyWebhookItem(tier='social_media')
  3. Webhook POST → backend's /api/ingest/apify-webhook
  4. Backend: Claude extraction → credit-steal detection → live corroboration
  5. If matches DMK archive: instant credit-steal flag with full receipts
  6. If 2+ press outlets covered same claim: auto-promoted to verified

Cost: ~$0.00025/tweet via Apify. Monitoring 5 handles × ~10 tweets/day
each = $0.012/day = $0.36/month.

Handles to monitor are in HANDLES below. Add/remove as you learn the
real network. The script is idempotent — running every hour is fine.

Usage:
    cd backend
    python ../scripts/monitor_tvk_handles.py                    # last 24h
    python ../scripts/monitor_tvk_handles.py --hours 6          # last 6h
    python ../scripts/monitor_tvk_handles.py --handles ttvkofficial,actorvijay
"""
import sys, json, time, argparse, urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.config import settings


# Tamil-press X/Twitter handles monitoring TVK coverage.
# Each tuple: (handle, friendly_label, default_tier)
#
# tier="online_native" or "regional_press" rather than "social_media" since
# these are established Tamil press outlets, not random accounts. That means
# a single tweet from them DOES count as a press source toward the 2+
# distinct outlets verification gate (unlike random social_media).
HANDLES: list[tuple[str, str, str]] = [
    # ---- Government official handles (the most important data source) ----
    # Tier = 'govt_announcement' — special tier that:
    #   * IS captured as primary evidence of official govt orders / claims
    #   * DOES NOT count toward press_sentiment meter (these are partisan
    #     spokespeople by definition, even when the underlying announcement
    #     is fact)
    #   * Triggers the Promise Comparator in ai_processor.py which matches
    #     each announcement against the manifesto and classifies as
    #     fulfilled / partial / broken / new_initiative
    ("CMOTamilnadu",    "CM Office, Tamil Nadu (now TVK)", "govt_announcement"),
    ("TNDIPRNEWS",      "TN DIPR (state PR dept)",         "govt_announcement"),
    # ---- Independent Tamil press on X (sentiment-bearing) ----
    ("SparkPluz_",      "Spark+ (TVK-skeptical Tamil)",    "online_native"),
    ("PttvNewsX",       "Puthiya Thalaimurai TV",          "regional_press"),
    ("youturn_in",      "YouTurn (Tamil fact-checker)",    "online_native"),
    ("News18TamilNadu", "News18 Tamil Nadu",               "established_press"),
    ("sunnewstamil",    "Sun News Tamil",                  "established_press"),
    # ---- TVK PARTY handles intentionally NOT monitored ----
    # @ttvkofficial / @actorvijay are partisan party propaganda channels.
    # We track what the GOVERNMENT (CMO/DIPR) officially says it has done,
    # not what the party claims about itself.
]

APIFY_ACTOR = "kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest"
TWITTER_DATE_FMT = "%a %b %d %H:%M:%S %z %Y"
# We DON'T post to the backend webhook — local script has direct DB access
# via the same Supabase credentials, so we invoke process_article in-process
# instead. This avoids the HF Spaces ADMIN_SECRET mismatch.


def trigger_scrape(handle: str, max_items: int) -> str:
    body = {"twitterContent": f"from:{handle}", "maxItems": max_items}
    req = urllib.request.Request(
        f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/runs?token={settings.apify_api_token}",
        data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=30).read())["data"]["id"]


def wait_for_run(run_id: str, max_seconds: int = 180) -> dict:
    url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={settings.apify_api_token}"
    for i in range(max_seconds // 5):
        d = json.loads(urllib.request.urlopen(url, timeout=15).read())["data"]
        if d["status"] in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            return d
        if i % 6 == 0:
            print(f"    [{i*5}s] {d['status']}")
        time.sleep(5)
    raise RuntimeError(f"Run {run_id} did not finish in {max_seconds}s")


def fetch_dataset(dataset_id: str) -> list[dict]:
    url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={settings.apify_api_token}&limit=200"
    return json.loads(urllib.request.urlopen(url, timeout=60).read())


def is_recent(created_at: str, cutoff: datetime) -> bool:
    try:
        dt = datetime.strptime(created_at, TWITTER_DATE_FMT)
    except (ValueError, TypeError):
        return False
    return dt >= cutoff


def to_webhook_item(tweet: dict, handle: str, tier: str) -> dict:
    """Convert an Apify-scraped tweet to the ApifyWebhookItem shape our
    backend expects. tier='social_media' tells the AI gate this is a
    single-source claim that needs press corroboration."""
    author = tweet.get("author") or {}
    text = (tweet.get("text") or "").strip()
    tweet_id = str(tweet.get("id") or tweet.get("tweet_id") or "")
    url = (tweet.get("url") or tweet.get("twitterUrl")
           or f"https://x.com/{author.get('userName') or handle}/status/{tweet_id}")

    media = []
    for m in tweet.get("media") or []:
        u = m.get("url") or m.get("media_url") or m.get("preview_image_url")
        if u:
            media.append(u)

    return {
        "url": url,
        "title": text[:200].replace("\n", " "),
        "text": text,
        "published_at": tweet.get("createdAt") or "",
        "source": f"twitter_{handle}",
        "tier": tier,
        "image_urls": media[:5],
    }


def process_items_locally(items: list[dict]) -> int:
    """Run process_article on each item directly against the production DB.
    Bypasses the FastAPI webhook auth wall."""
    import asyncio
    from app.models.schemas import ApifyWebhookItem
    from app.ingestion.ai_processor import process_article

    async def _run_all():
        count = 0
        for raw in items:
            try:
                item = ApifyWebhookItem(**raw)
                await process_article(item)
                count += 1
            except Exception as e:
                print(f"    process_article failed: {e}")
        return count

    return asyncio.run(_run_all())


def main(hours_back: int, handles: list[tuple[str, str, str]], max_per_handle: int):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    print(f"Monitoring TVK handles for tweets newer than {cutoff.isoformat()}")

    total_queued = 0
    for handle, label, tier in handles:
        print(f"\n--- @{handle}  ({label}) ---")
        try:
            run_id = trigger_scrape(handle, max_per_handle)
        except Exception as e:
            print(f"  FAIL trigger: {e}")
            continue
        print(f"  run: {run_id}")
        try:
            run = wait_for_run(run_id)
        except RuntimeError as e:
            print(f"  FAIL wait: {e}")
            continue
        if run["status"] != "SUCCEEDED":
            print(f"  scrape did not succeed: {run['status']}")
            continue

        items_raw = fetch_dataset(run["defaultDatasetId"])
        print(f"  raw tweets: {len(items_raw)}")
        recent = [t for t in items_raw if t.get("createdAt") and is_recent(t["createdAt"], cutoff)]
        print(f"  recent (≤{hours_back}h): {len(recent)}")

        if not recent:
            continue

        # Convert + run through process_article locally (direct DB)
        items = [to_webhook_item(t, handle, tier) for t in recent]
        print(f"  AI-processing {len(items)} tweets (extract → corroborate → save)…")
        try:
            done = process_items_locally(items)
            print(f"  processed: {done}")
            total_queued += done
        except Exception as e:
            print(f"  FAIL: {e}")

    print(f"\nDone. Total tweets queued: {total_queued}")
    print("Backend will now AI-extract + live-corroborate each tweet.")
    print("Check /admin → Pending Verification to see new arrivals.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--hours", type=int, default=24, help="Lookback window in hours (default 24)")
    ap.add_argument("--handles", type=str, default=None,
        help="Comma-separated handles (without @). Overrides the built-in list.")
    ap.add_argument("--per-handle", type=int, default=50,
        help="Max tweets to pull per handle per run")
    args = ap.parse_args()

    if args.handles:
        handles = [(h.strip().lstrip("@"), h.strip(), "social_media") for h in args.handles.split(",") if h.strip()]
    else:
        handles = HANDLES

    main(hours_back=args.hours, handles=handles, max_per_handle=args.per_handle)
