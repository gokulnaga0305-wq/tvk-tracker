"""Telegram bot webhook endpoint.

Receives raw Telegram Update payloads, validates the request via the
secret token Telegram is configured to include, and hands processing
off to a BackgroundTask. Responds 200 quickly so Telegram doesn't
retry.

Setup: see docs/telegram-bot-setup.md
"""
from __future__ import annotations
import asyncio
import collections
import logging
import time
from typing import Any, Optional
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])

# Ring buffer of (chat_id, username/title, timestamp) for the last
# webhook hits. Lets the admin self-discover their chat_id without
# disabling the webhook (Telegram forbids getUpdates+webhook together).
# Survives only until the next HF redeploy — but that's all you need.
_RECENT_CHATS: collections.deque = collections.deque(maxlen=50)


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

    # Record every chat that hits us — for the recent-chats diagnostic
    # endpoint. Useful so admin can self-discover their chat_id without
    # disabling the webhook (which would require Telegram getUpdates).
    msg = payload.get("message") or payload.get("channel_post") or {}
    chat = msg.get("chat") or {}
    cid = chat.get("id")
    if cid:
        _RECENT_CHATS.appendleft({
            "chat_id":    cid,
            "type":       chat.get("type"),
            "name":       chat.get("first_name") or chat.get("title"),
            "username":   chat.get("username"),
            "text_preview": (msg.get("text") or msg.get("caption") or "")[:60],
            "seen_at":    time.time(),
        })

    # Process SYNCHRONOUSLY — earlier observation showed HF Spaces kills
    # BackgroundTasks for long-running work (image OCR + AI extraction
    # takes 20-45s, BG tasks get terminated before completion). Telegram
    # webhooks have a 60s timeout, so we have margin. If processing ever
    # exceeds 60s, Telegram retries — process_article dedups by URL so
    # retries can't cause duplicates anyway.
    from app.ingestion.telegram_bot import handle_update
    try:
        await handle_update(payload)
        return {"status": "processed"}
    except Exception as e:
        logger.error("telegram handle_update sync failed: %s", e, exc_info=True)
        # Return 200 anyway so Telegram doesn't retry indefinitely
        return {"status": "error", "detail": str(e)[:200]}


@router.get("/telegram/recent-chats")
async def telegram_recent_chats() -> dict[str, Any]:
    """List chat_ids that have hit the webhook recently. Used so the
    admin can self-discover the correct chat_id to put into the
    TELEGRAM_ALLOWED_CHAT_IDS env var.

    No auth — payload contains no secrets. Ring buffer survives only
    until next HF redeploy."""
    now = time.time()
    out = []
    for entry in _RECENT_CHATS:
        out.append({
            **entry,
            "seconds_ago": round(now - entry["seen_at"]),
        })
    return {"recent_chats": out, "count": len(out)}


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
