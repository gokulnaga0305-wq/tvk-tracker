"""Twitter handle monitor — pulls recent tweets from configured handles,
runs each through process_article, returns a per-handle summary.

Originally lived in scripts/monitor_tvk_handles.py as a CLI run by GitHub
Actions. Promoted to backend module so the /api/cron/* endpoints can call
it directly without spawning a subprocess. The CLI script still imports
from here so behaviour is identical between the two entry points.

Apify cost: ~$0.00025/tweet. Each scrape pulls up to 50 tweets per
handle. 8 handles × 50 tweets × 12 runs/day = ~5,000 tweets/day max ≈
$1.25/day = ~$37/month worst case. In practice deduping + lookback
windows keep this far lower (~$0.50/month current).
"""
from __future__ import annotations
import json
import logging
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import Any

from app.config import settings
from app.ingestion.ai_processor import process_article
from app.models.schemas import ApifyWebhookItem

logger = logging.getLogger(__name__)

APIFY_ACTOR = "kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest"
TWITTER_DATE_FMT = "%a %b %d %H:%M:%S %z %Y"


# Canonical handle list — kept here so the cron endpoint and the CLI
# script see the same set. tier governs how each tweet is treated by the
# AI extractor + cross-reference loop. See ai_processor.py for tier
# semantics (govt_announcement vs press_tiers vs social_media).
HANDLES: list[tuple[str, str, str]] = [
    # Government official handles — feed the Promise Comparator
    ("CMOTamilnadu",    "CM Office, Tamil Nadu (now TVK)",                  "govt_announcement"),
    ("TNDIPRNEWS",      "TN DIPR (state PR dept)",                          "govt_announcement"),
    # Independent Tamil press on X (single-post = press_verified)
    ("SparkPluz_",      "Spark+ (TVK-skeptical Tamil)",                     "online_native"),
    ("PttvNewsX",       "Puthiya Thalaimurai TV",                           "regional_press"),
    ("youturn_in",      "YouTurn (Tamil fact-checker)",                     "online_native"),
    ("News18TamilNadu", "News18 Tamil Nadu",                                "established_press"),
    ("sunnewstamil",    "Sun News Tamil",                                   "established_press"),
    # Independent commentary / data threads
    ("dstock_insights", "DStock Insights (TN sectoral data + satire)",      "social_media"),
    # Opposition party IT wing — partisan but high-signal source for TVK
    # critiques. Treated as social_media tier so a single tweet alone
    # cannot publish to the public dashboard; it holds at
    # pending_verification until press cross-references the same event.
    # In practice this works as lead-generation: DMK IT Wing flags a TVK
    # incident -> our backend looks for press echo -> if Hindu/Spark+/
    # PttvNewsX corroborate, the incident graduates to multi_source_verified
    # and lands on the public dashboard. If press never picks it up the
    # claim stays in the admin queue, never on the public dashboard.
    # Same trust posture as the dstock_insights handle above.
    ("DMKITwing",       "DMK IT Wing (opposition party)",                   "social_media"),
]


def _trigger_scrape(handle: str, max_items: int) -> str:
    body = {"twitterContent": f"from:{handle}", "maxItems": max_items}
    req = urllib.request.Request(
        f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/runs?token={settings.apify_api_token}",
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=30).read())["data"]["id"]


def _wait_for_run(run_id: str, max_seconds: int = 180) -> dict:
    url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={settings.apify_api_token}"
    for i in range(max_seconds // 5):
        d = json.loads(urllib.request.urlopen(url, timeout=15).read())["data"]
        if d["status"] in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            return d
        time.sleep(5)
    raise RuntimeError(f"Run {run_id} did not finish in {max_seconds}s")


def _fetch_dataset(dataset_id: str) -> list[dict]:
    url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={settings.apify_api_token}&limit=200"
    return json.loads(urllib.request.urlopen(url, timeout=60).read())


def _is_recent(created_at: str, cutoff: datetime) -> bool:
    try:
        dt = datetime.strptime(created_at, TWITTER_DATE_FMT)
    except (ValueError, TypeError):
        return False
    return dt >= cutoff


def _to_item(tweet: dict, handle: str, tier: str) -> ApifyWebhookItem:
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
    return ApifyWebhookItem(
        url=url,
        title=text[:200].replace("\n", " "),
        text=text,
        published_at=tweet.get("createdAt") or "",
        source=f"twitter_{handle}",
        tier=tier,
        image_urls=media[:5],
    )


async def monitor_single_handle(
    handle: str,
    tier: str = "social_media",
    hours_back: int = 6,
    max_per_handle: int = 50,
) -> dict[str, Any]:
    """Scrape one handle and AI-process every tweet inside the lookback
    window. Returns a per-handle summary the cron endpoint can return
    to cron-job.org for logging."""
    if not settings.apify_api_token:
        return {"handle": handle, "error": "APIFY_API_TOKEN not set", "processed": 0}

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    summary = {"handle": handle, "tier": tier, "scraped": 0, "recent": 0, "processed": 0, "error": None}

    try:
        run_id = _trigger_scrape(handle, max_per_handle)
        run = _wait_for_run(run_id)
        if run["status"] != "SUCCEEDED":
            summary["error"] = f"Apify run {run_id} ended in status {run['status']}"
            return summary

        raw = _fetch_dataset(run["defaultDatasetId"])
        summary["scraped"] = len(raw)
        recent = [t for t in raw if t.get("createdAt") and _is_recent(t["createdAt"], cutoff)]
        summary["recent"] = len(recent)
        for tweet in recent:
            try:
                await process_article(_to_item(tweet, handle, tier))
                summary["processed"] += 1
            except Exception as e:
                logger.warning("process_article failed for tweet in %s: %s", handle, e)
    except Exception as e:
        summary["error"] = str(e)
    return summary


async def monitor_all_handles(
    hours_back: int = 6,
    max_per_handle: int = 50,
    handles: list[tuple[str, str, str]] | None = None,
) -> list[dict[str, Any]]:
    """Run monitor_single_handle for every configured handle in sequence
    (so we don't burn the HF Spaces CPU with concurrent runs). Returns a
    list of per-handle summaries.

    NOTE: Apify scrapes block on a 30-90s wait_for_run loop. With 8
    handles this can take 4-12 minutes total. Always invoke this as a
    BackgroundTask, never inline on a request handler — the cron-job.org
    HTTP client will time out.
    """
    if handles is None:
        handles = HANDLES
    results: list[dict[str, Any]] = []
    for handle, _label, tier in handles:
        r = await monitor_single_handle(handle, tier=tier,
                                         hours_back=hours_back,
                                         max_per_handle=max_per_handle)
        results.append(r)
    return results
