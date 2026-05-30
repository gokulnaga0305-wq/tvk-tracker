"""Telegram bot webhook endpoint.

Receives raw Telegram Update payloads, validates the request via the
secret token Telegram is configured to include, and hands processing
off to a BackgroundTask. Responds 200 quickly so Telegram doesn't
retry.

Setup: see docs/telegram-bot-setup.md
"""
from __future__ import annotations
import asyncio
import logging
from typing import Any, Optional
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.post("/telegram")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
):
    """Receives Telegram updates. Secured by the secret token Telegram
    is told to attach when setting the webhook (we reuse ADMIN_SECRET
    for this — Telegram only sends it back to us, never exposes it)."""
    if x_telegram_bot_api_secret_token != settings.admin_secret:
        # Don't leak which way it failed — just deny.
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        payload: dict[str, Any] = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Process in background so Telegram's retry timeout doesn't fire.
    from app.ingestion.telegram_bot import handle_update
    background_tasks.add_task(lambda: asyncio.run(handle_update(payload)))
    return {"status": "queued"}


@router.get("/telegram/health")
async def telegram_health() -> dict[str, Any]:
    """Quick health check — confirms the webhook router is reachable
    and the bot config is loaded."""
    return {
        "configured": bool(settings.telegram_bot_token),
        "allowed_chats_count": len(
            [c for c in (settings.telegram_allowed_chat_ids or "").split(",") if c.strip()]
        ),
        "ocr_configured": bool(settings.google_vision_api_key),
    }
