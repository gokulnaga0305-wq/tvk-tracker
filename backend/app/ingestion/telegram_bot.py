"""Telegram bot: image → OCR → AI extract → dedup → insert incident.

Pipeline
--------
1. Telegram POSTs an update to /api/webhook/telegram
2. Backend extracts photo (largest variant) + optional caption
3. Downloads image bytes via Telegram Bot API
4. OCRs via Google Vision (Tamil + English) — falls back to no-op if
   GOOGLE_VISION_API_KEY isn't configured
5. AI extracts structured incident from (OCR'd text + caption + any
   URL the caption mentions)
6. Fuzzy-matches against approved incidents in last 30 days
7. If duplicate -> reply 'ℹ️ already on dashboard, ignore' with link
8. If new -> insert as admin_verified incident, reply '✅ added' with link

Auth model
----------
Only chat IDs listed in settings.telegram_allowed_chat_ids
(comma-separated) are processed. All other chats are silently ignored
(don't even acknowledge — keeps the bot invisible to random people
who stumble onto it).

Cost: $0/month
  - Telegram bot (free)
  - Google Vision (1000 free OCR calls/month — admin upload volume
    is ~10-30/month, comfortably inside free tier)
  - Groq AI extraction (existing free tier)
"""
from __future__ import annotations
import base64
import difflib
import json
import logging
import re
import urllib.error
import urllib.request
from datetime import date, datetime, timezone, timedelta
from typing import Any, Optional

from app.config import settings
from app.database import get_db
from app.ingestion.ai_processor import (
    SYSTEM_PROMPT, EXTRACTION_PROMPT, llm_call_with_fallback,
    _strip_code_fences, _load_dmk_schemes_for_prompt,
)

logger = logging.getLogger(__name__)

DASHBOARD_URL = "https://tvk-tracker.vercel.app"

# Ring buffer of per-step diagnostics for the LAST ~50 Telegram
# processing attempts. Lets us debug "no reply" failures remotely
# via /api/webhook/telegram/recent-events without HF log access.
import collections as _collections
import time as _time
_RECENT_EVENTS: _collections.deque = _collections.deque(maxlen=50)


def _ev(chat_id, step: str, **detail) -> None:
    _RECENT_EVENTS.appendleft({
        "chat_id":   chat_id,
        "step":      step,
        "t":         _time.time(),
        **detail,
    })


# ---------------------------------------------------------------------------
# Telegram Bot API helpers
# ---------------------------------------------------------------------------
def _tg_api(method: str, payload: dict | None = None) -> dict:
    if not settings.telegram_bot_token:
        return {"_error": "TELEGRAM_BOT_TOKEN not configured"}
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}"
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(
        url,
        method="POST" if payload else "GET",
        data=data,
        headers={"Content-Type": "application/json"} if payload else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"_error": f"HTTP {e.code}: {e.read().decode()[:200]}"}
    except Exception as e:
        return {"_error": f"{type(e).__name__}: {str(e)[:120]}"}


def _send_message(chat_id: int, text: str, parse_mode: str | None = None) -> None:
    payload: dict[str, Any] = {"chat_id": chat_id, "text": text[:4000],
                                "disable_web_page_preview": True}
    if parse_mode:
        payload["parse_mode"] = parse_mode
    res = _tg_api("sendMessage", payload)
    if res.get("_error"):
        logger.warning("Telegram sendMessage failed: %s", res["_error"])


def _download_photo(file_id: str) -> Optional[bytes]:
    """Two-step: getFile -> downloadFile from telegram CDN."""
    meta = _tg_api("getFile", {"file_id": file_id})
    if meta.get("_error") or not meta.get("ok"):
        logger.warning("getFile failed: %s", meta)
        return None
    file_path = meta["result"]["file_path"]
    url = f"https://api.telegram.org/file/bot{settings.telegram_bot_token}/{file_path}"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return r.read()
    except Exception as e:
        logger.warning("Photo download failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# OCR — Google Vision (best Tamil quality on the free tier)
# ---------------------------------------------------------------------------
def _ocr_via_vision(image_bytes: bytes) -> str:
    """OCR via Google Vision API. Returns extracted text or '' on failure.

    Free tier: 1000 calls/month — way more than admin upload volume.
    """
    if not settings.google_vision_api_key:
        logger.warning("GOOGLE_VISION_API_KEY not configured — OCR disabled")
        return ""
    url = f"https://vision.googleapis.com/v1/images:annotate?key={settings.google_vision_api_key}"
    payload = {
        "requests": [{
            "image": {"content": base64.b64encode(image_bytes).decode()},
            "features": [{"type": "TEXT_DETECTION", "maxResults": 1}],
            # Hint at Tamil + English for better script detection
            "imageContext": {"languageHints": ["ta", "en"]},
        }]
    }
    req = urllib.request.Request(
        url,
        method="POST",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
    except Exception as e:
        logger.warning("Vision OCR failed: %s", e)
        return ""
    try:
        return data["responses"][0]["fullTextAnnotation"]["text"]
    except (KeyError, IndexError):
        return ""


# ---------------------------------------------------------------------------
# Fuzzy dedup against recent incidents
# ---------------------------------------------------------------------------
def _normalize_for_match(text: str) -> str:
    """Lowercase + strip non-alphanumerics for fuzzy match."""
    return re.sub(r"[^a-z0-9 ]+", "", (text or "").lower()).strip()


def _event_sig(category: str, location: str | None, incident_date: str | None) -> str:
    """Coarse event signature — matches identical (category, normalized
    location, incident_date) triples. Catches the case where AI words
    the title differently each time but extracts the same underlying
    event."""
    loc = re.sub(r"[^a-z0-9]+", "", (location or "").lower())[:30]
    return f"{(category or '').lower()}:{loc}:{incident_date or ''}"


def _find_duplicate(extracted: dict, lookback_days: int = 30) -> Optional[dict]:
    """Return the most-similar existing approved incident.

    Two-layer dedup:
      A. Event-signature exact match — (category, normalized location,
         incident_date) triple. Most reliable when AI worded the title
         differently across uploads (e.g. 'SC-Christians' vs 'Dalits').
      B. Fuzzy title+summary similarity >= 0.55 — backstop for when
         AI got slightly-off date or location.

    Threshold dropped 0.65 -> 0.55 after the AI extracted the same
    Tenkasi sickle-attack image with different wordings each time,
    pushing ratio below the old cutoff.
    """
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).date().isoformat()
    try:
        r = (
            db.table("incidents")
            .select("id, title, summary, category, location, incident_date, event_signature")
            .eq("status", "approved")
            .gte("incident_date", since)
            .execute()
        )
        rows = r.data or []
    except Exception:
        return None

    # Layer A: event-signature exact match (cheap; usually wins on
    # repeat uploads where AI extracts same category+location+date)
    new_sig = _event_sig(
        extracted.get("category", ""),
        extracted.get("location"),
        extracted.get("incident_date"),
    )
    for row in rows:
        if row.get("event_signature") == new_sig and new_sig != ":":
            row["_match_ratio"] = 1.0
            row["_match_via"] = "event_signature"
            return row

    # Layer B: fuzzy similarity on title+summary head
    target = _normalize_for_match(
        f"{extracted.get('title', '')} {extracted.get('summary', '')[:200]}"
    )
    if not target:
        return None
    best_match = None
    best_ratio = 0.0
    for row in rows:
        candidate = _normalize_for_match(
            f"{row.get('title', '')} {(row.get('summary', '') or '')[:200]}"
        )
        if not candidate:
            continue
        ratio = difflib.SequenceMatcher(None, target, candidate).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = row
    if best_match and best_ratio >= 0.55:
        best_match["_match_ratio"] = round(best_ratio, 2)
        best_match["_match_via"] = "fuzzy_title"
        return best_match
    return None


# ---------------------------------------------------------------------------
# AI extraction (reuses the same prompt as Twitter/RSS path)
# ---------------------------------------------------------------------------
def _extract_incident(*, ocr_text: str, caption: str, source_url: str) -> Optional[dict]:
    db = get_db()
    schemes_block = _load_dmk_schemes_for_prompt(db)
    combined_text = ocr_text
    if caption:
        combined_text = f"USER CAPTION: {caption}\n\n--- OCR'D ARTICLE TEXT ---\n{ocr_text}"
    prompt = EXTRACTION_PROMPT.format(
        url=source_url or "telegram_upload",
        source="telegram_admin_upload",
        published=date.today().isoformat(),
        title=caption[:100] if caption else "Telegram-uploaded screenshot",
        text=combined_text[:8000],
        dmk_schemes=schemes_block,
        today=date.today().isoformat(),
    )
    raw = llm_call_with_fallback(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=900,
    )
    if not raw:
        return None
    try:
        return json.loads(_strip_code_fences(raw))
    except Exception:
        logger.warning("Telegram bot: AI returned invalid JSON")
        return None


def _extract_incident_from_image(*, image_bytes: bytes, caption: str, source_url: str) -> Optional[dict]:
    """Vision-model extraction — reads the image directly, skipping OCR.

    Works much better than 'OCR + then AI on the text' for:
      - mobile-compressed screenshots (Tamil glyphs survive better when
        read pixel-by-pixel vs OCR'd to text first)
      - multi-panel composites (vision model sees layout context, not
        just a wall of de-positioned text)
      - mixed-language headlines (Tamil + English in same image)
      - tweets/social posts with images (extracts both the post text
        AND any sub-images at once)

    Uses Groq's llama-3.2-90b-vision-preview (free tier). Falls back
    to None on failure — caller can then attempt the OCR+text path
    if Vision API is configured.
    """
    if not settings.groq_api_key:
        return None
    from openai import OpenAI
    db = get_db()
    schemes_block = _load_dmk_schemes_for_prompt(db)
    b64 = base64.b64encode(image_bytes).decode()
    prompt_text = EXTRACTION_PROMPT.format(
        url=source_url or "telegram_upload",
        source="telegram_admin_upload",
        published=date.today().isoformat(),
        title=caption[:100] if caption else "Telegram-uploaded screenshot",
        text=(
            f"USER CAPTION: {caption}\n\n"
            f"--- IMAGE BELOW — read all text (Tamil + English), "
            f"understand the layout, identify the incident ---"
        ),
        dmk_schemes=schemes_block,
        today=date.today().isoformat(),
    )
    client = OpenAI(
        api_key=settings.groq_api_key,
        base_url="https://api.groq.com/openai/v1",
    )
    # Groq's multimodal models — try newer first, fall back
    for model in ("meta-llama/llama-4-scout-17b-16e-instruct",
                  "llama-3.2-90b-vision-preview",
                  "llama-3.2-11b-vision-preview"):
        try:
            resp = client.chat.completions.create(
                model=model,
                max_tokens=900,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": [
                        {"type": "text", "text": prompt_text},
                        {"type": "image_url", "image_url": {
                            "url": f"data:image/jpeg;base64,{b64}",
                        }},
                    ]},
                ],
            )
            raw = resp.choices[0].message.content
            try:
                return json.loads(_strip_code_fences(raw))
            except Exception:
                logger.warning("Vision model returned invalid JSON: %s", raw[:200])
                continue
        except Exception as e:
            logger.warning("Vision model %s failed: %s", model, e)
            continue
    return None


# ---------------------------------------------------------------------------
# Caption URL extraction (so admin can paste a press URL alongside image)
# ---------------------------------------------------------------------------
_URL_RE = re.compile(r"https?://[^\s]+", re.I)


def _extract_url_from_caption(caption: str) -> str:
    if not caption:
        return ""
    m = _URL_RE.search(caption)
    return m.group(0) if m else ""


# ---------------------------------------------------------------------------
# Auth: only allow whitelisted chat IDs
# ---------------------------------------------------------------------------
def _is_allowed_chat(chat_id: int) -> bool:
    raw = (settings.telegram_allowed_chat_ids or "").strip()
    if not raw:
        # Empty whitelist = disabled (deny all). Operator must opt in
        # by adding their chat ID to the env var.
        return False
    allowed = {s.strip() for s in raw.split(",") if s.strip()}
    return str(chat_id) in allowed


# ---------------------------------------------------------------------------
# Main entry — called from the webhook endpoint
# ---------------------------------------------------------------------------
async def handle_update(update: dict[str, Any]) -> None:
    """Process one Telegram Update payload. Idempotent; fast-returns on
    non-allowed chats / non-photo messages."""
    msg = update.get("message") or update.get("channel_post") or {}
    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    _ev(chat_id, "handler_entered", has_photo=bool(msg.get("photo")),
        has_document=bool(msg.get("document")),
        has_text=bool(msg.get("text")))
    if not chat_id or not _is_allowed_chat(chat_id):
        _ev(chat_id, "rejected_unauthorized_chat")
        return

    # Telegram represents image uploads two ways:
    #  - `photo`: compressed inline image (mobile/standard upload)
    #  - `document`: original-quality file (Telegram Web drag-drop often
    #    uses this for images, also when user explicitly attaches as
    #    file). We accept both transparently.
    photos = msg.get("photo") or []
    document = msg.get("document") or {}
    is_image_doc = (
        document
        and (document.get("mime_type") or "").startswith("image/")
    )
    caption = (msg.get("caption") or "").strip()

    # /start handshake — confirm the bot is alive for new admins
    text = (msg.get("text") or "").strip()
    if text.startswith("/start") or text.startswith("/help"):
        _send_message(chat_id,
            "TVK Tracker bot — upload a screenshot of a news article, "
            "tweet, or social post and I'll extract the incident, "
            "check for duplicates, and add it to the dashboard.\n\n"
            "Optionally include the source URL in the caption.\n\n"
            f"Dashboard: {DASHBOARD_URL}"
        )
        return

    if not photos and not is_image_doc:
        # Text-only message — could be a URL with no image. If it's a
        # URL, also process via the existing manual-ingest path. For
        # MVP, prompt for image.
        if text and _URL_RE.search(text):
            _send_message(chat_id,
                "I see a URL but no image. Image uploads work best — "
                "I OCR + extract from screenshots. URL-only ingestion "
                "isn't wired in this MVP; paste the screenshot."
            )
        else:
            _send_message(chat_id, "Upload an image of a news article/screenshot to add it to the dashboard.")
        return

    _ev(chat_id, "image_detected", photos=len(photos), is_image_doc=is_image_doc)
    # Immediate ack so user knows we received it. Vision-AI takes ~15-30s.
    _send_message(chat_id, "Got it — reading image (~20s)...")
    _ev(chat_id, "ack_sent")

    # Pick the file_id to download. Prefer original-quality document
    # if user attached as file, otherwise pick the largest photo variant.
    if is_image_doc:
        file_id = document["file_id"]
    else:
        best = max(photos, key=lambda p: p.get("file_size") or 0)
        file_id = best["file_id"]
    image_bytes = _download_photo(file_id)
    if not image_bytes:
        _ev(chat_id, "download_failed", file_id=file_id[:30])
        _send_message(chat_id, "Couldn't download the image. Try again?")
        return
    _ev(chat_id, "download_ok", bytes=len(image_bytes))

    # Pull a URL from the caption if present (used as source_url)
    source_url = _extract_url_from_caption(caption)

    # Vision-first extraction — Groq's llama vision model reads the
    # image directly (Tamil + English, multi-panel, compressed mobile
    # screenshots all work). Skips OCR entirely. If vision fails, fall
    # back to Google Vision OCR + text-only AI extract.
    _ev(chat_id, "vision_extract_start")
    extracted = _extract_incident_from_image(
        image_bytes=image_bytes,
        caption=caption,
        source_url=source_url,
    )
    extraction_path = "vision"
    _ev(chat_id, "vision_extract_done",
        got_result=bool(extracted),
        is_relevant=(extracted.get("is_relevant") if extracted else None))

    if not extracted:
        # Fall back to OCR + text-AI path
        _ev(chat_id, "ocr_fallback_start")
        ocr_text = _ocr_via_vision(image_bytes)
        ocr_len = len(ocr_text.strip())
        combined_len = ocr_len + len(caption.strip())
        _ev(chat_id, "ocr_fallback_done", ocr_chars=ocr_len, caption_chars=len(caption))
        if combined_len < 30:
            _send_message(chat_id,
                f"Couldn't extract anything readable from this image.\n"
                f"  vision model: failed\n"
                f"  ocr: {ocr_len} chars\n"
                f"  caption: {len(caption)} chars\n\n"
                f"Try a clearer screenshot or add a caption describing what's in it."
            )
            return
        extracted = _extract_incident(
            ocr_text=ocr_text, caption=caption, source_url=source_url,
        )
        extraction_path = "ocr_fallback"
        _ev(chat_id, "ocr_text_extract_done", got_result=bool(extracted))
    if not extracted:
        _send_message(chat_id, "AI extraction failed. Check the image or try again in a moment.")
        return
    # ADMIN-UPLOAD TRUST OVERRIDE:
    # The AI's relevance gate is calibrated for unsupervised Twitter/RSS
    # ingestion where most content is opinion/spam. For admin Telegram
    # uploads, the admin already filtered by deciding to upload — we
    # respect that judgment. The AI extraction still runs (for category
    # / location / date structuring) but is_relevant=False does NOT block.
    #
    # Edge case: AI couldn't extract a usable title at all.  Bail in
    # that case — there's nothing useful to insert.
    if not extracted.get("is_relevant"):
        _ev(chat_id, "ai_relevance_overridden", ai_reason=extracted.get("reason"))
        # If the AI couldn't even produce a title, the extraction is
        # too thin to be useful even with the override.
        if not (extracted.get("title") or "").strip():
            reason = (extracted.get("reason") or "AI couldn't structure the image")[:200]
            _send_message(chat_id,
                f"Couldn't extract a usable incident from this image.\n"
                f"AI said: {reason}\n\n"
                f"Add a caption describing what's in it and re-upload — "
                f"that'll give the AI enough context to structure it."
            )
            return
        # Otherwise: proceed. The admin uploaded it, the admin vouches.
        # Mark this in ai_raw so we can audit which incidents got the
        # override later.
        extracted["_admin_override"] = True

    # Hard date gate — same as the AI pipeline elsewhere
    from datetime import date as _date
    inc_date_s = extracted.get("incident_date")
    if inc_date_s:
        try:
            if _date.fromisoformat(inc_date_s) < _date(2026, 5, 11):
                _send_message(chat_id,
                    f"Not added: incident is pre-May-11 2026 "
                    f"({inc_date_s}). The tracker only covers the TVK admin era."
                )
                return
        except Exception:
            pass

    # Fuzzy dedup against recent incidents
    duplicate = _find_duplicate(extracted)
    if duplicate:
        _send_message(chat_id,
            f"ℹ️ Already on dashboard ({int(duplicate['_match_ratio']*100)}% match):\n"
            f"\"{duplicate['title']}\"\n"
            f"{DASHBOARD_URL}/incidents/{duplicate['id']}\n\n"
            f"You can ignore this upload — it's already captured."
        )
        return

    # Insert as admin_verified (you uploaded it, you vouch for it)
    db = get_db()
    payload = {
        "title":              extracted["title"][:200],
        "summary":            extracted["summary"][:2000],
        "category":           extracted.get("category", "other"),
        "incident_date":      extracted.get("incident_date") or date.today().isoformat(),
        "location":           extracted.get("location"),
        "severity":           extracted.get("severity", 3),
        "ai_confidence":      extracted.get("confidence", 0.85),
        "status":             "approved",
        "verification_status": "admin_verified",
        # If caption had a URL we use it as the source. Otherwise the
        # source IS the Telegram upload + admin trust.
        "source_urls":        [source_url] if source_url else [
            f"telegram://admin-upload/chat-{chat_id}/{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}"
        ],
        "source_count":       1,
        "ai_raw":             {
            "telegram_source":   True,
            "caption":           caption,
            "extraction_path":   extraction_path,  # 'vision' or 'ocr_fallback'
            "from_chat_id":      chat_id,
            "ingested_at":       datetime.now(timezone.utc).isoformat(),
            "tags_extra":        (extracted.get("tags_extra") or []),
            # Whether the AI said is_relevant=False but admin override
            # let it through. Useful for retroactive QA.
            "admin_override":    bool(extracted.get("_admin_override")),
            "ai_reason":         extracted.get("reason"),
        },
        "is_credit_steal":    extracted.get("is_credit_steal", False),
        "press_sentiment":    extracted.get("press_sentiment"),
        "image_urls":         [],
        "member_ids":         [],
        # event_signature lets future Telegram uploads dedup against
        # this row even if the AI words the title differently next time
        "event_signature":    _event_sig(
            extracted.get("category", ""),
            extracted.get("location"),
            extracted.get("incident_date"),
        ),
    }
    try:
        res = db.table("incidents").insert(payload).execute()
        if not res.data:
            _send_message(chat_id, "Insert failed (no row returned). Check backend logs.")
            return
        new_id = res.data[0]["id"]
        # Audit
        try:
            db.table("incident_audit").insert({
                "incident_id": new_id,
                "action":      "created",
                "actor":       "telegram_bot",
                "to_value":    "admin_verified",
                "reason":      f"Telegram upload from chat {chat_id}. Caption: {caption[:200]}",
            }).execute()
        except Exception:
            pass
        _send_message(chat_id,
            f"NEW INCIDENT ADDED\n"
            f"Title: {extracted['title']}\n"
            f"Category: {extracted['category']} · severity {extracted.get('severity', 3)}\n"
            f"{DASHBOARD_URL}/incidents/{new_id}"
        )
    except Exception as e:
        logger.error("Telegram bot insert failed: %s", e)
        _send_message(chat_id, f"Insert error: {str(e)[:200]}")
