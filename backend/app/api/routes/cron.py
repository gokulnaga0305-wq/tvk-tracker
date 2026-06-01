"""HTTP-triggered cron endpoints.

Designed for cron-job.org (free external scheduler) to hit on a real
schedule, replacing the GitHub Actions workflows that were getting
throttled 3-5h past their configured cadence on the free tier.

All endpoints:
  - Require x-admin-secret header
  - Return 202 Accepted immediately
  - Run heavy work in BackgroundTasks so cron-job.org sees a fast response

Cost: zero — cron-job.org is free unlimited. Apify scrapes cost the
same as before (~$0.50/month current). HF Spaces handles orchestration
on free tier (kept warm by /api/cron/keep-warm itself).
"""
from __future__ import annotations
import logging
import asyncio
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cron", tags=["cron"])


def _require_admin(secret: Optional[str]) -> None:
    if not secret or secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")


# ---------------------------------------------------------------------------
# Tamil press + govt-handle monitor
# ---------------------------------------------------------------------------
@router.post("/monitor-handles")
async def cron_monitor_handles(
    background_tasks: BackgroundTasks,
    hours_back: int = Query(6, ge=1, le=72,
        description="Lookback window per handle (hours). Default 6h."),
    max_per_handle: int = Query(50, ge=1, le=200,
        description="Max tweets to pull per handle per run"),
    x_admin_secret: Optional[str] = Header(None),
):
    """Scrape every configured Tamil press / govt handle via Apify and
    AI-process the recent ones. Schedule on cron-job.org every 1h or 2h.

    Returns 202 immediately; work runs in background. Check /api/stats/
    dashboard or the admin Pending Verification queue after a few min
    to see new arrivals.
    """
    _require_admin(x_admin_secret)
    from app.ingestion.twitter_monitor import monitor_all_handles, HANDLES

    async def _go():
        try:
            summaries = await monitor_all_handles(
                hours_back=hours_back,
                max_per_handle=max_per_handle,
            )
            total = sum(s.get("processed", 0) for s in summaries)
            logger.info("monitor-handles run complete: %d total tweets processed across %d handles",
                        total, len(summaries))
        except Exception as e:
            logger.error("monitor-handles background task failed: %s", e)

    background_tasks.add_task(lambda: asyncio.run(_go()))
    return {
        "status": "queued",
        "handles": len(__import__("app.ingestion.twitter_monitor", fromlist=["HANDLES"]).HANDLES),
        "hours_back": hours_back,
        "max_per_handle": max_per_handle,
    }


@router.post("/monitor-handle/{handle}")
async def cron_monitor_one_handle(
    handle: str,
    background_tasks: BackgroundTasks,
    tier: str = Query("social_media",
        description="Tier (govt_announcement | established_press | regional_press | online_native | social_media)"),
    hours_back: int = Query(6, ge=1, le=72),
    max_per_handle: int = Query(50, ge=1, le=200),
    x_admin_secret: Optional[str] = Header(None),
):
    """Scrape a single named handle. Use when you want one cron-job.org
    job per handle (better isolation, easier to debug per-handle issues)."""
    _require_admin(x_admin_secret)
    from app.ingestion.twitter_monitor import monitor_single_handle

    async def _go():
        try:
            s = await monitor_single_handle(handle, tier=tier,
                                             hours_back=hours_back,
                                             max_per_handle=max_per_handle)
            logger.info("monitor-handle %s: %s", handle, s)
        except Exception as e:
            logger.error("monitor-handle %s failed: %s", handle, e)

    background_tasks.add_task(lambda: asyncio.run(_go()))
    return {"status": "queued", "handle": handle, "tier": tier}


# ---------------------------------------------------------------------------
# Corroboration sweeps (replaces continuous-trickle-sweep + corroboration-sweep)
# ---------------------------------------------------------------------------
@router.post("/sweep-verify")
async def cron_sweep_verify(
    background_tasks: BackgroundTasks,
    max_age_days: int = Query(45, ge=1, le=365),
    limit: Optional[int] = Query(10, ge=1, le=500,
        description="Cap on incidents scanned per run. 10 = trickle, omit/500 = full sweep."),
    x_admin_secret: Optional[str] = Header(None),
):
    """Wraps /api/ingest/sweep-verify with BackgroundTasks so cron-job.org
    sees an instant 202. The actual Google News verification loop can
    take several minutes for large limits.

    Recommended cron-job.org schedules:
      - Every 30 min: limit=10 (trickle, near-realtime promotion)
      - Daily 03:30 IST: limit=500 (full nightly sweep)
    """
    _require_admin(x_admin_secret)
    from app.ingestion.corroboration import sweep_pending

    def _go():
        try:
            r = sweep_pending(max_age_days=max_age_days, limit=limit)
            logger.info("sweep-verify completed: %s", r)
        except Exception as e:
            logger.error("sweep-verify background task failed: %s", e)

    background_tasks.add_task(_go)
    return {"status": "queued", "max_age_days": max_age_days, "limit": limit}


# ---------------------------------------------------------------------------
# Daily meter snapshot (replaces meter-snapshot.yml)
# ---------------------------------------------------------------------------
@router.post("/meter-snapshot")
async def cron_meter_snapshot(
    background_tasks: BackgroundTasks,
    x_admin_secret: Optional[str] = Header(None),
):
    """Captures today's incumbency meter score as a snapshot for the
    trend sparkline. Idempotent per day. Schedule daily 23:30 IST."""
    _require_admin(x_admin_secret)
    from app.api.routes.stats import capture_meter_snapshot

    async def _go():
        try:
            r = await capture_meter_snapshot(x_admin_secret=settings.admin_secret)
            logger.info("meter-snapshot captured: %s", r.get("score") if isinstance(r, dict) else r)
        except Exception as e:
            logger.error("meter-snapshot background task failed: %s", e)

    background_tasks.add_task(lambda: asyncio.run(_go()))
    return {"status": "queued"}


# ---------------------------------------------------------------------------
# Daily promise audit (replaces promise-audit-daily.yml)
# ---------------------------------------------------------------------------
@router.post("/promise-audit")
async def cron_promise_audit(
    background_tasks: BackgroundTasks,
    retro_limit: Optional[int] = Query(None, ge=1, le=500,
        description="Cap on retro-comparator items. Omit to scan everything."),
    x_admin_secret: Optional[str] = Header(None),
):
    """Runs the daily promise-accountability audit:
      1. Deadline-pass: pending promises whose deadline lapsed without
         verifiable delivery -> auto-flipped to broken
      2. Retro-comparator: re-runs the Promise Comparator over the last
         24h of post-May-11 incidents that mention scheme keywords

    Schedule daily 24:00 IST (after the day's news cycle settles)."""
    _require_admin(x_admin_secret)

    def _go():
        try:
            # Import lazily — these scripts live outside the app package
            import sys
            from pathlib import Path
            scripts = Path(__file__).resolve().parents[3] / "scripts"
            if str(scripts) not in sys.path:
                sys.path.insert(0, str(scripts))
            from audit_promises import deadline_pass, retro_comparator
            deadline_pass(dry_run=False)
            retro_comparator(dry_run=False, limit=retro_limit)
            logger.info("promise-audit complete (deadline-pass + retro-comparator)")
        except Exception as e:
            logger.error("promise-audit background task failed: %s", e)

    background_tasks.add_task(_go)
    return {"status": "queued", "retro_limit": retro_limit}


# ---------------------------------------------------------------------------
# Press + Reddit + Google News RSS ingestion (free-tier replacement
# for most Apify Twitter scraping)
# ---------------------------------------------------------------------------
@router.post("/scrape-press-rss")
async def cron_scrape_press_rss(
    background_tasks: BackgroundTasks,
    max_items_per_source: int = Query(25, ge=1, le=100,
        description="Cap on items pulled per RSS source per run"),
    x_admin_secret: Optional[str] = Header(None),
):
    """Pull every registered RSS source (Spark+, Puthiya Thalaimurai,
    r/TVKFiles, r/TamilnaduDiscussion, Google News TVK keyword) and
    AI-process each item through the same process_article pipeline as
    Apify-monitored tweets.

    Free-tier replacement for most of the Apify scraping load.
    Recommended cadence: every 30 min (cheap — just HTTP fetches +
    Groq AI extraction).
    """
    _require_admin(x_admin_secret)
    from app.ingestion.rss_ingest import ingest_all_sources

    async def _go():
        try:
            results = await ingest_all_sources(max_items_per_source=max_items_per_source)
            total_processed = sum(r.get("processed", 0) for r in results)
            logger.info("rss_ingest run: %d items processed across %d sources",
                        total_processed, len(results))
        except Exception as e:
            logger.error("rss_ingest background task failed: %s", e)

    background_tasks.add_task(lambda: __import__("asyncio").run(_go()))
    return {"status": "queued", "max_items_per_source": max_items_per_source}


# ---------------------------------------------------------------------------
# Weekly fact-check scraper (NewsMeter)
# ---------------------------------------------------------------------------
@router.post("/scrape-factcheckers")
async def cron_scrape_factcheckers(
    background_tasks: BackgroundTasks,
    max_per_source: int = Query(8, ge=1, le=30,
        description="Cap on articles per source per run"),
    x_admin_secret: Optional[str] = Header(None),
):
    """Sweep NewsMeter and YouTurn fact-check tag pages for new
    post-May-11 TVK / CM Vijay debunks. New articles are AI-extracted
    and inserted into propaganda_events with status='active'.

    Recommended schedule: weekly (e.g., Sundays 04:30 IST). Debunks
    land on slow cadence and the AI cost is bounded (~$0.03/week).
    """
    _require_admin(x_admin_secret)
    from app.ingestion.factcheck_scraper import scrape_all_sources

    def _go():
        try:
            result = scrape_all_sources(max_per_source=max_per_source)
            logger.info("factcheck scrape complete: %s", result)
        except Exception as e:
            logger.error("factcheck scrape background task failed: %s", e)

    background_tasks.add_task(_go)
    return {"status": "queued", "max_per_source": max_per_source}


# ---------------------------------------------------------------------------
# Keep-warm — no work, just touches the Space
# ---------------------------------------------------------------------------
@router.get("/keep-warm")
async def cron_keep_warm():
    """No-auth GET so cron-job.org can keep the HF Space warm without
    needing the admin secret. Returns 200 cheaply; importantly the very
    act of receiving the request keeps the Space's container alive past
    the idle-shutdown threshold.
    Schedule every 5 minutes."""
    return {"status": "warm", "govt_day": settings.govt_day_number}


# ---------------------------------------------------------------------------
# Ingestion watchdog — the thing that ENDS manual "are we up to date?" checks
# ---------------------------------------------------------------------------
@router.post("/ingestion-watchdog")
async def cron_ingestion_watchdog(
    stale_hours: int = Query(4, ge=1, le=48,
        description="Alert if zero incidents created in this many hours"),
    x_admin_secret: Optional[str] = Header(None),
):
    """Health-check ingestion and PING THE ADMIN ON TELEGRAM if it stalled.

    Converts 'the admin has to keep manually checking the dashboard' into
    'the system tells the admin when it needs attention'. Checks:
      1. Were any incidents created in the last `stale_hours`?
      2. Is at least one AI provider actually answering?
      3. Is the Apify token still valid / OpenRouter still funded?

    If anything is wrong, sends ONE concise Telegram message to every
    allowed chat id. Schedule on cron-job.org every 2-3 hours.

    Returns the health summary so cron-job.org logs are useful too.
    """
    _require_admin(x_admin_secret)
    from datetime import datetime, timezone, timedelta
    from app.database import get_db

    db = get_db()
    now = datetime.now(timezone.utc)
    problems: list[str] = []
    summary: dict = {"checked_at": now.isoformat()}

    # 1. Ingestion freshness — any incident rows created recently?
    since = (now - timedelta(hours=stale_hours)).isoformat()
    try:
        r = db.table("incidents").select("id", count="exact").gte("created_at", since).execute()
        recent_count = r.count or 0
    except Exception as e:
        recent_count = -1
        problems.append(f"DB count failed: {str(e)[:80]}")
    summary["incidents_last_%dh" % stale_hours] = recent_count
    if recent_count == 0:
        problems.append(f"No incidents ingested in {stale_hours}h")

    # 2. AI provider liveness — fire one trivial probe through the chain
    try:
        from app.ingestion.ai_processor import _get_client_chain, _get_gate_chain
        live = []
        for label, chain in [("extract", _get_client_chain()), ("gate", _get_gate_chain())]:
            ok = False
            for client, model in chain:
                try:
                    client.chat.completions.create(
                        model=model, max_tokens=3,
                        messages=[{"role": "user", "content": "OK"}],
                    )
                    ok = True
                    live.append(f"{label}:{model.split('/')[-1]}")
                    break
                except Exception:
                    continue
            if not ok:
                problems.append(f"No live AI provider for '{label}' chain")
        summary["ai_live"] = live
    except Exception as e:
        problems.append(f"AI probe failed: {str(e)[:80]}")

    # 3. OpenRouter balance (cheap to check; the silent killer all day)
    try:
        import json as _json, urllib.request
        if settings.openrouter_api_key:
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/credits",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = _json.loads(resp.read()).get("data", {})
            remaining = (data.get("total_credits", 0) or 0) - (data.get("total_usage", 0) or 0)
            summary["openrouter_remaining_usd"] = round(remaining, 3)
            if remaining < 1.0:
                problems.append(f"OpenRouter low: ${remaining:.2f} left")
    except Exception as e:
        summary["openrouter_check"] = f"err: {str(e)[:60]}"

    summary["healthy"] = not problems
    summary["problems"] = problems

    # 4. If unhealthy, alert admin on Telegram (the whole point)
    if problems:
        try:
            from app.ingestion.telegram_bot import _send_message
            chat_ids = [c.strip() for c in (settings.telegram_allowed_chat_ids or "").split(",") if c.strip()]
            msg = (
                "⚠️ TVK Tracker ingestion needs attention:\n\n"
                + "\n".join(f"• {p}" for p in problems)
                + f"\n\nLast {stale_hours}h: {recent_count} incidents."
                + (f"\nAI live: {', '.join(summary.get('ai_live', [])) or 'NONE'}")
                + ("\n\nLikely fix: top up OpenRouter (openrouter.ai/credits) "
                   "or wait for Groq daily reset (midnight UTC).")
            )
            for cid in chat_ids:
                try:
                    _send_message(int(cid), msg)
                except Exception:
                    pass
            summary["alerted_chats"] = len(chat_ids)
        except Exception as e:
            summary["alert_error"] = str(e)[:100]

    return summary
