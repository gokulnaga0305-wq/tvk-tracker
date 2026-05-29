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
# Weekly fact-check scraper (NewsMeter, YouTurn)
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
