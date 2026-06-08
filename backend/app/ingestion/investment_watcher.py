"""Investment watcher — Phase 2 of the Investment Commitment Registry.

For each active commitment in `investment_commitments`, search Google News
for status/risk signals ("shifted", "stalled", "moves to Andhra", etc.).
When a risk signal is found, raise a PENDING incident for human review and
stamp `last_checked`. It never auto-declares a loss and never auto-flips the
registry status — a stall is not a loss until a human confirms it. Free:
RSS + keyword match, no AI call.
"""
from __future__ import annotations
import logging
import re
import urllib.parse
from datetime import datetime, timezone

from app.database import get_db
from app.ingestion.rss_ingest import _fetch

logger = logging.getLogger(__name__)

# Risk signals that suggest a commitment may be moving / dying.
RISK_TERMS = [
    "shifted", "shift to", "shifts to", "stalled", "stall", "scrapp", "cancel",
    "shelv", "withdraw", "pulls out", "pull out", "pull-out", "moves to",
    "moving to", "relocat", "another state", "abandon", "on hold", "put on hold",
    "delayed", "scrapped", "exits", "pull back", "drops plan", "drop plan",
    # rival states that would signal a flight
    "andhra", "telangana", "karnataka", "gujarat", "maharashtra", "to ap",
]
# Don't fire on these — they're positive/neutral and create false alarms.
POSITIVE_GUARD = ["inaugurat", "commission", "operational", "begins production",
                  "starts production", "opens", "expands in tamil nadu"]


def _news_rss(company: str) -> str:
    q = f'"{company}" Tamil Nadu'
    return ("https://news.google.com/rss/search?q="
            + urllib.parse.quote(q) + "&hl=en-IN&gl=IN&ceid=IN:en")


def _parse_items(xml: str) -> list[dict]:
    out = []
    for block in re.findall(r"<item>(.*?)</item>", xml, flags=re.S | re.I):
        def grab(tag):
            m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", block, flags=re.S | re.I)
            v = (m.group(1) if m else "").strip()
            v = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", v, flags=re.S)
            return re.sub(r"<.*?>", "", v).strip()
        out.append({"title": grab("title"), "link": grab("link"),
                    "pubDate": grab("pubDate")})
    return out


def run_investment_watch(max_companies: int = 40) -> dict:
    db = get_db()
    try:
        rows = (db.table("investment_commitments").select("*")
                .in_("status", ["committed", "in_progress"]).execute().data or [])
    except Exception as e:
        logger.warning("investment_watch: registry read failed: %s", e)
        return {"checked": 0, "flagged": 0, "error": str(e)[:120]}

    now = datetime.now(timezone.utc).isoformat()
    flagged = 0
    for r in rows[:max_companies]:
        company = r["company"]
        first_word = re.sub(r"[^a-z]", "", company.split()[0].lower())
        xml = _fetch(_news_rss(company))
        try:
            db.table("investment_commitments").update({"last_checked": now}).eq("id", r["id"]).execute()
        except Exception:
            pass
        if not xml:
            continue

        hits = []
        for it in _parse_items(xml):
            t = (it.get("title") or "").lower()
            if first_word and first_word in t \
               and any(k in t for k in RISK_TERMS) \
               and not any(g in t for g in POSITIVE_GUARD):
                hits.append(it)
        if not hits:
            continue

        top = hits[0]
        sig = f"inv_watch:{first_word}:{now[:7]}"  # one alert per company per month
        try:
            exists = db.table("incidents").select("id").eq("event_signature", sig).execute().data
            if exists:
                continue
            db.table("incidents").insert({
                "title": f"WATCH: {company} — possible investment shift flagged",
                "summary": (
                    f"Auto-watcher flagged a risk signal on the DMK-era commitment "
                    f"'{company}' (₹{int(r.get('amount_cr') or 0)} cr, {r.get('sector')}, "
                    f"{r.get('location')}). Headline: \"{top['title']}\". "
                    f"NOT a confirmed loss — pending human review. Verify the source "
                    f"before this is treated as a shift/cancellation."),
                "category": "industrial_flight",
                "incident_date": now[:10],
                "location": r.get("location"),
                "source_urls": [top.get("link")] if top.get("link") else [],
                "source_count": 1,
                "severity": 3,
                "ai_confidence": 0.5,
                "member_ids": [],
                "status": "pending_review",
                "verification_status": "pending_verification",
                "event_signature": sig,
            }).execute()
            flagged += 1
            logger.info("investment_watch: flagged %s", company)
        except Exception as e:
            logger.warning("investment_watch: insert failed for %s: %s", company, e)

    return {"checked": len(rows), "flagged": flagged}
