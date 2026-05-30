"""Free-tier RSS-based incident ingestion.

Breaks the dashboard's hard dependency on Apify Twitter scraping by
pulling from RSS feeds that have full article content for free. Each
RSS item becomes an ApifyWebhookItem and goes through the same
process_article() pipeline as Apify-monitored tweets, so trust gating,
dedup, cross-reference, etc. all work identically.

Verified working sources (probed 2026-05-29):
  - Spark+ (Tamil critical press)            sparkpluz.com/feed
  - Puthiya Thalaimurai (Tamil mainstream)   puthiyathalaimurai.com/feed
  - Reddit r/TVKFiles (curated TVK accountability)
  - Reddit r/TamilnaduDiscussion (broader TN politics)
  - Google News RSS (TVK + CM Vijay keyword search) — aggregates
    Hindu/NIE/DT Next/etc. via single query, replaces direct outlet
    RSS feeds that returned HTTP errors or 0 items

Dead / unreachable RSS feeds (left out):
  - News18 Tamil  (404 / 0 items)
  - Sun News      (DNS fail)
  - YouTurn       (0 items)
  - DT Next       (HTTP error)
  - The Hindu     (timeout)
  - NIE           (HTTP error)
  These outlets' articles still flow in via Google News when they
  cover TVK news, so we don't actually lose them.

Apify is now only used for govt-tier handles (@CMOTamilnadu,
@TNDIPRNEWS) where the Tweet IS the announcement and no press echo
exists. ~2,000 Apify scrapes/month = ~$0.50/month, comfortably
inside Apify's $5 free tier.

Cost: $0/month for this scraper. AI extraction via Groq is free.
"""
from __future__ import annotations
import logging
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Optional
import xml.etree.ElementTree as ET

from app.config import settings
from app.ingestion.ai_processor import process_article
from app.models.schemas import ApifyWebhookItem

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (compatible; TVKTracker-RSSIngest/1.0; "
    "+https://tvk-tracker.vercel.app)"
)


# Source registry. Each source maps to:
#   source_label  — what gets stored as `sources.outlet`
#   tier          — trust tier for process_article (governs whether a
#                   single source counts as press_verified or holds at
#                   pending_verification)
#   rss_url       — the feed URL
#
# Architecture note (2026-05-30): Twitter-to-RSS bridges (nitter.net,
# rsshub.app, twiiit.com, all known Nitter mirrors) are BLOCKED from
# HuggingFace Spaces' IP range — proven via /api/diagnostics/usage
# probe returning 403 / RemoteDisconnected on every attempt. The
# bridges work from a residential / developer IP but not from HF.
# That means we cannot live-scrape Twitter for free on the cloud.
#
# Paths to Twitter content from HF:
#   1. Apify (paid, ~$0.50/mo for 2 govt handles at 2h cadence)
#   2. Google News RSS with outlet/handle keywords — catches news
#      content from these outlets when other sites cover them
#   3. Direct press-site RSS for outlets that expose one (Spark+,
#      Puthiya Thalaimurai)
#
# Apify monitor-handles cron remains the canonical path for the 2
# govt handles (CMOTamilnadu, TNDIPRNEWS) — their content is
# unavailable any other way. Free $5/mo tier handles this comfortably.
SOURCES_RSS: list[dict[str, str]] = [
    # ---- Direct press-site RSS (the only outlets that publish
    #      working RSS feeds reachable from HF) ----
    {
        "source_label": "rss_sparkplus_site",
        "tier":         "online_native",
        "rss_url":      "https://sparkpluz.com/feed/",
        "name":         "Spark+ (site)",
    },
    {
        "source_label": "rss_puthiyathalaimurai_site",
        "tier":         "regional_press",
        "rss_url":      "https://puthiyathalaimurai.com/feed/",
        "name":         "Puthiya Thalaimurai (site)",
    },
    # ---- Reddit (single post = pending_verification, needs press echo) ----
    {
        "source_label": "rss_reddit_tvkfiles",
        "tier":         "social_media",
        "rss_url":      "https://www.reddit.com/r/TVKFiles/.rss",
        "name":         "r/TVKFiles",
    },
    {
        "source_label": "rss_reddit_tn_discussion",
        "tier":         "social_media",
        "rss_url":      "https://www.reddit.com/r/TamilnaduDiscussion/.rss",
        "name":         "r/TamilnaduDiscussion",
    },
    # ---- Google News aggregator (catches every English outlet that
    #      covers TVK — Hindu, NIE, DT Next, etc. without per-outlet
    #      scraping) ----
    {
        "source_label": "rss_gnews_tvk",
        "tier":         "established_press",
        "rss_url":      "https://news.google.com/rss/search?q=%22Tamil+Nadu%22+%22CM+Vijay%22+OR+TVK&hl=en-IN&gl=IN&ceid=IN:en",
        "name":         "Google News (TVK)",
    },
    {
        "source_label": "rss_gnews_tvk_full",
        "tier":         "established_press",
        "rss_url":      "https://news.google.com/rss/search?q=Tamilaga+Vettri+Kazhagam&hl=en-IN&gl=IN&ceid=IN:en",
        "name":         "Google News (TVK full name)",
    },
    # Google News queries specifically biased toward catching content
    # from the Twitter handles HF can no longer reach directly. These
    # queries return any article that quotes/references the outlet —
    # so a Sun News tweet that becomes a news story flows in this way.
    {
        "source_label": "rss_gnews_sunnews",
        "tier":         "established_press",
        "rss_url":      "https://news.google.com/rss/search?q=%22Sun+News%22+Tamil+Nadu+TVK&hl=en-IN&gl=IN&ceid=IN:en",
        "name":         "Google News (Sun News + TVK)",
    },
    {
        "source_label": "rss_gnews_news18",
        "tier":         "established_press",
        "rss_url":      "https://news.google.com/rss/search?q=%22News18%22+Tamil+Nadu+TVK&hl=en-IN&gl=IN&ceid=IN:en",
        "name":         "Google News (News18 + TVK)",
    },
    {
        "source_label": "rss_gnews_vijay_cm",
        "tier":         "established_press",
        "rss_url":      "https://news.google.com/rss/search?q=%22CM+Vijay%22+%22Tamil+Nadu%22&hl=en-IN&gl=IN&ceid=IN:en",
        "name":         "Google News (CM Vijay)",
    },
]


def _fetch(url: str, timeout: int = 25) -> Optional[str]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        logger.warning("HTTP %d fetching %s", e.code, url)
        return None
    except Exception as e:
        logger.warning("Fetch failed for %s: %s", url, e)
        return None


def _strip_html(text: str) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<style[^>]*>.*?</style>",   " ", text, flags=re.S | re.I)
    text = re.sub(r"<!\[CDATA\[", "", text)
    text = re.sub(r"\]\]>", "", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (text.replace("&nbsp;", " ").replace("&amp;", "&")
                .replace("&quot;", '"').replace("&#39;", "'")
                .replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">"))
    return re.sub(r"\s+", " ", text).strip()


def _parse_rss(xml_text: str) -> list[dict[str, str]]:
    """Parse RSS 2.0 / Atom into a uniform list of item dicts.

    Each dict has: link, title, description (+content if available),
    pub_date_iso, media_urls.
    """
    items: list[dict[str, Any]] = []
    try:
        root = ET.fromstring(xml_text)
        for el in root.iter():
            if "}" in el.tag:
                el.tag = el.tag.split("}", 1)[1]
        # Both RSS <item> and Atom <entry> handled
        for it in list(root.iter("item")) + list(root.iter("entry")):
            d: dict[str, Any] = {"media_urls": []}
            for child in it:
                tag = child.tag.lower()
                if tag == "link":
                    href = child.attrib.get("href")
                    d["link"] = (href or child.text or "").strip()
                elif tag in ("title", "description", "summary"):
                    d[tag] = (child.text or "").strip()
                elif tag == "encoded":
                    d["content"] = (child.text or "").strip()
                elif tag in ("pubdate", "published", "updated"):
                    d["pub_date"] = (child.text or "").strip()
                elif tag == "thumbnail":
                    u = child.attrib.get("url")
                    if u:
                        d["media_urls"].append(u)
                elif tag == "content" and child.attrib.get("url"):
                    d["media_urls"].append(child.attrib["url"])
            if "pub_date" in d:
                try:
                    dt = parsedate_to_datetime(d["pub_date"])
                    d["pub_date_iso"] = dt.astimezone(timezone.utc).isoformat()
                except Exception:
                    d["pub_date_iso"] = ""
            else:
                d["pub_date_iso"] = ""
            items.append(d)
    except ET.ParseError:
        # Regex fallback (Reddit's RSS occasionally serves slightly off XML)
        for m in re.finditer(r"<item\b[^>]*>(.*?)</item>", xml_text, flags=re.S | re.I):
            block = m.group(1)
            def _grab(tag: str) -> str:
                mm = re.search(rf"<{tag}\b[^>]*>(.*?)</{tag}>", block, flags=re.S | re.I)
                return (mm.group(1).strip() if mm else "")
            items.append({
                "link":          _strip_html(_grab("link")),
                "title":         _strip_html(_grab("title")),
                "description":   _strip_html(_grab("description")),
                "pub_date":      _grab("pubDate"),
                "pub_date_iso":  "",
                "media_urls":    [],
            })
    return items


def _build_webhook_item(item: dict[str, Any], source: dict[str, str]) -> Optional[ApifyWebhookItem]:
    url = item.get("link")
    if not url:
        return None
    title = item.get("title") or ""
    # Body: prefer full content, fall back to description/summary
    body_html = item.get("content") or item.get("description") or item.get("summary") or ""
    body = _strip_html(body_html)
    if not body and not title:
        return None
    return ApifyWebhookItem(
        url=url,
        title=title[:200],
        text=body[:8000],
        published_at=item.get("pub_date_iso") or item.get("pub_date", ""),
        source=source["source_label"],
        tier=source["tier"],
        image_urls=(item.get("media_urls") or [])[:5],
    )


async def ingest_one_source(source: dict[str, str], *, max_items: int = 25) -> dict[str, Any]:
    """Pull one RSS source and AI-process every item via process_article.

    Returns counts {discovered, processed, errors}. Dedup happens
    inside process_article (URL already in `sources` table -> skip).
    """
    out = {"source": source["name"], "discovered": 0, "processed": 0, "errors": 0}
    xml_text = _fetch(source["rss_url"])
    if not xml_text:
        out["errors"] = 1
        return out
    items = _parse_rss(xml_text)
    out["discovered"] = len(items)
    for it in items[:max_items]:
        webhook_item = _build_webhook_item(it, source)
        if not webhook_item:
            continue
        try:
            await process_article(webhook_item)
            out["processed"] += 1
        except Exception as e:
            logger.warning("rss_ingest: process_article failed for %s: %s", webhook_item.url, e)
            out["errors"] += 1
    return out


async def ingest_all_sources(*, max_items_per_source: int = 25) -> list[dict[str, Any]]:
    """Sweep every registered RSS source sequentially."""
    results: list[dict[str, Any]] = []
    for src in SOURCES_RSS:
        try:
            r = await ingest_one_source(src, max_items=max_items_per_source)
            results.append(r)
        except Exception as e:
            results.append({"source": src["name"], "error": str(e)})
    return results
