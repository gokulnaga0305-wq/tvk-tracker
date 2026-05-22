"""
AI ingestion pipeline.

Provider routing:
  - If OPENROUTER_API_KEY is set → use OpenRouter (OpenAI-compatible, accepts UPI in India)
  - Else if ANTHROPIC_API_KEY is set → use Anthropic direct
  - Else: skip AI processing
"""
import json
import logging
from datetime import date
from openai import OpenAI
from app.config import settings
from app.database import get_db
from app.models.schemas import ApifyWebhookItem

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Tamil Nadu political fact-checking analyst. Your job is to analyze news articles
about the TVK (Tamilaga Vettri Kazhagam) government in Tamil Nadu and extract structured incident data.

TVK took power on May 11, 2026 under CM Vijay. A critical pattern to flag is "credit stealing" — when TVK
ministers or spokespersons claim credit for schemes, projects, or achievements that were actually initiated
or completed by the previous DMK government (under M.K. Stalin).

Respond ONLY with valid JSON. No markdown, no explanation, no code fences."""

EXTRACTION_PROMPT = """Analyze this news article and extract incident information.

Article URL: {url}
Title: {title}
Content: {text}

Return a JSON object with these exact fields:
{{
  "is_relevant": true/false,
  "title": "concise incident title (max 100 chars)",
  "summary": "2-3 sentence factual summary",
  "category": one of ["corruption", "murders", "sexual_assault", "crimes_women_kids", "censorship",
                       "credit_stealing", "governance", "police_excess", "drug_menace",
                       "media_blackout", "tenders", "fake_news", "alcohol_menace", "other"],
  "incident_date": "YYYY-MM-DD",
  "location": "district or city name, or null",
  "is_credit_steal": true/false,
  "original_credit": "description of what was previously done by DMK/others, or null",
  "people_mentioned": ["list of names"],
  "severity": 1-5 (1=minor, 5=critical),
  "confidence": 0.0-1.0,
  "reason": "brief reason for confidence score"
}}

Rules:
- Set is_relevant=false if the article is NOT about TVK government actions, Tamil Nadu politics, TN crime/governance, or DMK-TVK political dynamics
- Set is_credit_steal=true if TVK is claiming credit for something done/started by a previous government (especially DMK)
- For incident_date: use the event date from the article, not publication date. If unclear, use today: {today}
- confidence should reflect how clearly the article supports the incident (not severity)"""


def _get_client_and_model() -> tuple[OpenAI | None, str]:
    """Return (client, model_id) tuple. Client is None if no provider configured."""
    if settings.openrouter_api_key:
        client = OpenAI(
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "https://tvk-files.local",
                "X-Title": "TVK Tracker",
            },
        )
        # OpenRouter model IDs: anthropic/claude-haiku-4.5, anthropic/claude-sonnet-4.6
        return client, "anthropic/claude-haiku-4.5"

    if settings.anthropic_api_key:
        # Anthropic also exposes an OpenAI-compatible endpoint at api.anthropic.com/v1
        client = OpenAI(
            api_key=settings.anthropic_api_key,
            base_url="https://api.anthropic.com/v1",
        )
        return client, "claude-haiku-4-5"

    return None, ""


async def process_article(item: ApifyWebhookItem) -> None:
    client, model = _get_client_and_model()
    if client is None:
        logger.warning("No AI provider configured — skipping article: %s", item.url)
        return

    try:
        text_truncated = item.text[:8000] if item.text else ""
        prompt = EXTRACTION_PROMPT.format(
            url=item.url,
            title=item.title,
            text=text_truncated,
            today=date.today().isoformat(),
        )

        response = client.chat.completions.create(
            model=model,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )

        raw_text = response.choices[0].message.content.strip()
        # Strip markdown code fences if model added them
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        extracted = json.loads(raw_text)

        if not extracted.get("is_relevant", False):
            logger.debug("Not relevant: %s", item.url)
            return

        db = get_db()

        # Skip duplicates
        existing = db.table("sources").select("id").eq("url", item.url).execute()
        if existing.data:
            logger.debug("Already processed: %s", item.url)
            return

        db.table("sources").insert({
            "url": item.url,
            "outlet": item.source or "unknown",
            "title": item.title,
        }).execute()

        confidence = extracted.get("confidence", 0.5)
        status = "approved" if confidence >= 0.75 else "pending_review"

        incident_payload = {
            "title": extracted["title"],
            "summary": extracted["summary"],
            "category": extracted["category"],
            "incident_date": extracted.get("incident_date", date.today().isoformat()),
            "location": extracted.get("location"),
            "source_urls": [item.url],
            "is_credit_steal": extracted.get("is_credit_steal", False),
            "original_credit": extracted.get("original_credit"),
            "severity": extracted.get("severity", 1),
            "ai_confidence": confidence,
            "member_ids": [],
            "status": status,
            "ai_raw": extracted,
        }

        db.table("incidents").insert(incident_payload).execute()
        logger.info("Saved [%s] conf=%.2f: %s", status, confidence, extracted["title"])

    except json.JSONDecodeError as e:
        logger.error("AI returned invalid JSON for %s: %s", item.url, e)
    except Exception as e:
        logger.error("Failed to process %s: %s", item.url, e)
