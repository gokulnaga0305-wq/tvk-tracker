from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from app.models.schemas import ApifyWebhookPayload
from app.ingestion.ai_processor import process_article
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.post("/apify-webhook")
async def apify_webhook(
    payload: ApifyWebhookPayload,
    background_tasks: BackgroundTasks,
    x_apify_secret: str = Header(...),
):
    if x_apify_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")

    logger.info(f"Received {len(payload.items)} items from actor {payload.actorId}")
    for item in payload.items:
        background_tasks.add_task(process_article, item)

    return {"queued": len(payload.items)}


@router.post("/manual")
async def manual_ingest(
    url: str,
    title: str,
    text: str,
    background_tasks: BackgroundTasks,
    x_admin_secret: str = Header(...),
):
    """Manually submit an article URL for AI processing."""
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")

    from app.models.schemas import ApifyWebhookItem
    item = ApifyWebhookItem(url=url, title=title, text=text)
    background_tasks.add_task(process_article, item)
    return {"status": "queued"}
