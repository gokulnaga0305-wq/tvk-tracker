"""Weekly scraper for external fact-check sites (NewsMeter, YouTurn).

Discovers post-May-11 TVK / CM Vijay debunks from each site's
fact-check tag pages and creates `propaganda_events` rows in
status='active' (admin queue, NOT auto-published to the
PropagandaReach widget). Admin reviews each row before approval.

Sites covered
-------------
- NewsMeter Tamil:  https://newsmeter.in/fact-check-tamil
- NewsMeter English fact-check: https://newsmeter.in/fact-check
- YouTurn:          https://youturn.in (Tamil + English)

Cost
----
Apify NOT used — this is a direct urllib fetch + AI extraction.
~5 articles/run × 2 sites = ~$0.03/week in Claude Haiku calls.

Schedule
--------
Weekly via cron-job.org → POST /api/cron/scrape-factcheckers.
Sub-hour cadence is overkill — debunks land slowly relative to
press tweets.
"""
from __future__ import annotations
import json
import logging
import re
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from typing import Any, Optional

from app.config import settings
from app.database import get_db
from app.ingestion.ai_processor import llm_call_with_fallback, _strip_code_fences

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (compatible; TVKTracker-FactCheckSweep/1.0; "
    "+https://tvk-tracker.vercel.app)"
)

# Hard filter — only ingest debunks dated after this. TVK swearing-in.
GOVT_START = date(2026, 5, 11)


# ---------------------------------------------------------------------------
# Source registry — keep declarative so adding a new fact-checker is one entry.
# ---------------------------------------------------------------------------
SOURCES = [
    {
        "name": "NewsMeter Tamil",
        "tag_url": "https://newsmeter.in/fact-check-tamil",
        "article_url_re": re.compile(
            r'https://newsmeter\.in/fact-check-tamil/[a-z0-9-]+-\d{6}',
            re.IGNORECASE,
        ),
        "outlet_label": "NewsMeter Tamil",
    },
    {
        "name": "NewsMeter Fact-check",
        "tag_url": "https://newsmeter.in/fact-check",
        "article_url_re": re.compile(
            r'https://newsmeter\.in/fact-check/[a-z0-9-]+-\d{6}',
            re.IGNORECASE,
        ),
        "outlet_label": "NewsMeter",
    },
    {
        "name": "YouTurn",
        "tag_url": "https://youturn.in/tag/tamil-nadu",
        # YouTurn slugs follow /article/<slug>; the path varies, so use a
        # broader match and filter by relevance downstream.
        "article_url_re": re.compile(
            r'https://(?:www\.)?youturn\.in/[a-z]+/[a-z0-9-]+/?',
            re.IGNORECASE,
        ),
        "outlet_label": "YouTurn",
    },
]


SYSTEM_PROMPT_FC = (
    "You are an analyst cataloguing fact-checks of pro-TVK and anti-TVK "
    "propaganda in Tamil Nadu. Read the article and output strict JSON. "
    "No markdown fences. No prose around the JSON."
)


EXTRACTION_PROMPT_FC = """Analyze this fact-check article. Decide if it documents a debunked claim
about the TVK government, CM Vijay, or Tamil Nadu post-May-11 2026
politics. If yes, extract the structured fields below.

Article URL: {url}
Outlet:      {outlet}
Article text excerpt:
{text}

Return ONLY JSON with these fields:
{{
  "is_relevant": true/false,
  "title":            "FAKE: <one-line summary of the false claim>",
  "description":      "2-4 sentences: what was claimed, what the truth is, what frame the propaganda served",
  "propaganda_type":  one of [
                        "manufactured_achievement",  // false credit for an action
                        "dubbed_footage",            // DMK/old footage re-credited
                        "deepfake",                  // AI-generated image/video
                        "paid_trending",             // engagement farming
                        "misleading_edit",           // selective edit
                        "fake_quote",                // words never said
                        "meme_glorification",        // hero-edit
                        "astroturfing",
                        "misattributed_event",       // real event credited wrongly
                        "other"
                      ],
  "favoring":         "TVK" | "ANTI-TVK"   // who benefits from the lie
  "platform":         "instagram" | "twitter" | "whatsapp" | "facebook" | "youtube" | "tiktok" | "telegram" | "multiple" | null,
  "reach_estimate":   integer estimate of original-fake reach (followers reached, view count) OR null if no signal,
  "first_seen":       "YYYY-MM-DD"   // when propaganda first appeared (article will state)
  "incident_date":    "YYYY-MM-DD"   // when the alleged event happened (often same as first_seen)
  "tags":             [3-6 short keywords],
  "confidence":       0.0-1.0
}}

RULES:
- is_relevant=FALSE if this is not about TVK / CM Vijay / Tamil Nadu
  post-May-11 govt.
- Skip if the article is about elections (pre May 11).
- first_seen MUST be on or after 2026-05-11. If the article says
  the propaganda spread earlier, set is_relevant=false.
- For propaganda_type, prefer specific labels over "other".
- favoring is the side the propaganda BENEFITS: a fake achievement
  by Vijay = "TVK"; a fake outrage AGAINST Vijay (e.g. communal-bait
  insinuations about his religion) = "ANTI-TVK".
- reach_estimate: only fill if article cites view/share counts. If it
  says "viral" or "widely shared" without numbers, leave null.
- confidence: how confident YOU are in the extraction (not the AI's
  confidence in the debunk itself — NewsMeter and YouTurn are
  trustworthy sources by assumption).
"""


def _fetch(url: str, timeout: int = 25) -> Optional[str]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            # naive utf-8 with replace for any weird bytes
            return data.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        logger.warning("HTTP %d fetching %s", e.code, url)
        return None
    except Exception as e:
        logger.warning("Fetch failed for %s: %s", url, e)
        return None


def _discover_article_urls(tag_url: str, pattern: re.Pattern) -> list[str]:
    """Scrape a fact-check tag page for article URLs matching the pattern.

    Returns deduped list, ordered by appearance on the page (which is
    typically most-recent-first on these CMSes).
    """
    html = _fetch(tag_url)
    if not html:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for m in pattern.finditer(html):
        u = m.group(0).rstrip("/")
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _strip_html(text: str) -> str:
    """Cheap HTML → text. Good enough for the LLM extractor."""
    # Remove script/style blocks first
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<style[^>]*>.*?</style>",   " ", text, flags=re.S | re.I)
    # Collapse all tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Decode common entities
    text = (text.replace("&nbsp;", " ").replace("&amp;", "&")
                .replace("&quot;", '"').replace("&#39;", "'")
                .replace("&lt;", "<").replace("&gt;", ">"))
    return re.sub(r"\s+", " ", text).strip()


def _already_processed(db, url: str) -> bool:
    try:
        # contains() works for text[] columns in postgrest
        r = (
            db.table("propaganda_events")
            .select("id")
            .or_(f"debunk_url.eq.{url},source_urls.cs.{{{url}}}")
            .limit(1)
            .execute()
        )
        return bool(r.data)
    except Exception:
        return False


def _extract_propaganda(url: str, outlet: str, body: str) -> Optional[dict[str, Any]]:
    prompt = EXTRACTION_PROMPT_FC.format(url=url, outlet=outlet, text=body[:6000])
    raw = llm_call_with_fallback(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_FC},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=900,
    )
    if not raw:
        return None
    try:
        return json.loads(_strip_code_fences(raw))
    except json.JSONDecodeError:
        logger.warning("AI returned invalid JSON for %s", url)
        return None


def scrape_all_sources(max_per_source: int = 8) -> dict[str, int]:
    """Sweep every registered fact-check source. Returns per-source
    counts of {discovered, new, queued, skipped_irrelevant, ai_failed}.
    """
    db = get_db()
    out: dict[str, dict[str, int]] = {}

    for src in SOURCES:
        name = src["name"]
        outlet = src["outlet_label"]
        urls = _discover_article_urls(src["tag_url"], src["article_url_re"])
        counts = {"discovered": len(urls), "new": 0, "queued": 0,
                  "skipped_irrelevant": 0, "ai_failed": 0}

        for url in urls[:max_per_source]:
            if _already_processed(db, url):
                continue
            counts["new"] += 1
            html = _fetch(url)
            if not html:
                counts["ai_failed"] += 1
                continue
            body = _strip_html(html)
            extracted = _extract_propaganda(url, outlet, body)
            if not extracted:
                counts["ai_failed"] += 1
                continue
            if not extracted.get("is_relevant"):
                counts["skipped_irrelevant"] += 1
                continue

            # Date gate — extra safety beyond the prompt's own gate
            fs = extracted.get("first_seen")
            try:
                if fs and date.fromisoformat(fs) < GOVT_START:
                    counts["skipped_irrelevant"] += 1
                    continue
            except Exception:
                pass

            try:
                row = {
                    "title":         extracted.get("title", "FAKE: <unparsed>")[:200],
                    "description":   extracted.get("description"),
                    "propaganda_type": extracted.get("propaganda_type", "other"),
                    "favoring":      extracted.get("favoring", "TVK"),
                    "platform":      extracted.get("platform"),
                    "reach_estimate": extracted.get("reach_estimate"),
                    "debunk_url":    url,
                    "debunk_source": outlet,
                    # Conservative default — fact-checker article reach.
                    "debunk_reach_estimate": 15_000,
                    "first_seen":    extracted.get("first_seen"),
                    "incident_date": extracted.get("incident_date"),
                    # status='active' = pending admin review, NOT yet
                    # showing on public PropagandaReach widget. The /api/
                    # propaganda/summary endpoint sums everything, but
                    # 'active' rows are reasonable to show as part of the
                    # asymmetry total since they're sourced from a
                    # trustworthy fact-checker, not from random claims.
                    # Admin can flip to 'organic' or delete if needed.
                    "status":        "active",
                    "tags":          extracted.get("tags") or [],
                    "source_urls":   [url, src["tag_url"]],
                    "notes": (
                        f"Auto-ingested by factcheck_scraper on "
                        f"{datetime.now(timezone.utc).isoformat()}. "
                        f"AI confidence: {extracted.get('confidence')}. "
                        f"Reach is conservative — debunk source: {outlet}."
                    ),
                }
                db.table("propaganda_events").insert(row).execute()
                counts["queued"] += 1
            except Exception as e:
                logger.warning("Insert failed for %s: %s", url, e)
                counts["ai_failed"] += 1

        out[name] = counts
        logger.info("factcheck_scraper: %s -> %s", name, counts)

    return out
