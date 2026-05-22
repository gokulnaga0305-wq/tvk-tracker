"""
AI ingestion pipeline (trust-first architecture).

Stages per article:
  1. Claude extracts structured incident data (broader relevance criteria)
  2. Check against DMK schemes registry for credit-steal heuristic
  3. Cross-reference Supabase for similar incidents in last 48h → bump source_count
  4. Decide verification_status:
       - 2+ independent sources → 'multi_source_verified' (auto-publish)
       - 1 source only          → 'pending_verification' (admin queue)
  5. Query Google Fact Check API for related debunks (best-effort)
  6. If article carries images → enqueue them for AI-detection workflow
"""
import json
import logging
import re
from datetime import date, datetime, timedelta, timezone
from openai import OpenAI
from app.config import settings
from app.database import get_db
from app.models.schemas import ApifyWebhookItem
from app.ingestion.factcheck import lookup_factchecks
from app.ingestion.image_check import enqueue_images

logger = logging.getLogger(__name__)

GOVT_START = "May 11, 2026"

SYSTEM_PROMPT = f"""You are a fact-checking analyst for a Tamil Nadu accountability dashboard.

CONTEXT:
- The TVK (Tamilaga Vettri Kazhagam) government under CM Vijay took office on {GOVT_START}.
- Everything happening in Tamil Nadu after that date falls under TVK's responsibility,
  regardless of whether TVK is directly named in the article.
- The previous DMK government (under M.K. Stalin, 2021-2026) launched many welfare
  schemes, infrastructure projects, and industrial investments. A pattern to flag is
  "credit stealing" — when the TVK government renames, expands, or relaunches these
  initiatives without acknowledgement.

Respond ONLY with valid JSON. No markdown fences, no explanation."""

EXTRACTION_PROMPT = """Analyze this news article and decide whether it represents a TVK-era incident
worth tracking on a public accountability dashboard.

Article URL:     {url}
Source outlet:   {source}
Published:       {published}
Title:           {title}
Content excerpt: {text}

Known DMK-era schemes the TVK government may be claiming credit for (each row is
"NAME | ALIASES"):
{dmk_schemes}

Return JSON with these fields exactly:
{{
  "is_relevant": true/false,
  "title": "concise factual title (max 100 chars, no opinion language)",
  "summary": "2-3 sentence neutral factual summary (no editorializing)",
  "category": one of [
    "corruption", "murders", "sexual_assault", "crimes_women_kids",
    "police_excess", "custodial_death", "honour_killing",
    "censorship", "media_blackout", "fake_news", "propaganda",
    "credit_stealing", "broken_promise",
    "governance", "tenders", "power_cut", "water_shortage", "civic_failure",
    "drug_menace", "alcohol_menace", "communal_violence",
    "industrial_flight", "investment_announcement",
    "federalism", "language_imposition", "dravidian_attack",
    "other"
  ],
  "incident_date": "YYYY-MM-DD",
  "location": "district / city name in Tamil Nadu, or null if not TN-specific",
  "is_credit_steal": true/false,
  "related_dmk_scheme": "EXACT name from list above if matched, else null",
  "original_credit": "what DMK actually did (only if is_credit_steal=true)",
  "people_mentioned": ["names of officials, ministers, accused, etc."],
  "severity": 1-5 (1=minor procedural, 5=loss-of-life/major scandal),
  "confidence": 0.0-1.0,
  "reason": "one-sentence rationale for confidence + relevance"
}}

RELEVANCE RULES (apply liberally — when in doubt, set is_relevant=true):
  - Any crime, governance failure, or civic issue in Tamil Nadu after {today}
    is relevant — TVK is the ruling government and accountable.
  - National political news (Modi, BJP, etc.) is NOT relevant unless it
    directly impacts TN.
  - Sports, entertainment, lifestyle, business deals outside TN: NOT relevant.
  - Weather forecasts alone: NOT relevant. Weather causing failure (flood,
    no power restoration): RELEVANT (civic_failure).

CREDIT-STEAL DETECTION:
  - If the article describes TVK announcing/expanding/relaunching/renaming
    any scheme in the DMK list above, set is_credit_steal=true and
    related_dmk_scheme to the EXACT name from the list.
  - Note in original_credit: when DMK launched it, beneficiary count, etc.

CONFIDENCE SCORING:
  - 0.9+ : Clearly sourced, named officials, specific date/place, official quotes
  - 0.7-0.9 : Sourced report, some specifics
  - 0.5-0.7 : Reported but vague — needs cross-check
  - <0.5 : Speculative or single anonymous source"""


def _get_client_and_model() -> tuple[OpenAI | None, str]:
    if settings.openrouter_api_key:
        return OpenAI(
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "https://tvk-tracker.vercel.app",
                "X-Title": "TVK Tracker",
            },
        ), "anthropic/claude-haiku-4.5"
    if settings.anthropic_api_key:
        return OpenAI(
            api_key=settings.anthropic_api_key,
            base_url="https://api.anthropic.com/v1",
        ), "claude-haiku-4-5"
    return None, ""


def _load_dmk_schemes_for_prompt(db) -> str:
    try:
        res = db.table("dmk_schemes").select("name, aliases").execute()
        rows = res.data or []
    except Exception:
        return "(scheme registry unavailable)"
    lines = []
    for r in rows:
        aliases = ", ".join(r.get("aliases") or [])
        lines.append(f"  - {r['name']} | aliases: {aliases}")
    return "\n".join(lines) if lines else "(registry empty)"


def _event_signature(extracted: dict) -> str:
    """Normalized key for fuzzy dedup. Two articles with the same
    category + location + incident_date are presumed to be the same event."""
    cat = (extracted.get("category") or "other").lower()
    loc = re.sub(r"[^a-z0-9]+", "", (extracted.get("location") or "").lower())[:30]
    d = extracted.get("incident_date") or date.today().isoformat()
    return f"{cat}:{loc}:{d}"


def _strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = s.split("```", 2)[1]
        if s.startswith("json"):
            s = s[4:]
        s = s.strip()
    return s


def _record_audit(db, incident_id: str, action: str, **fields) -> None:
    try:
        db.table("incident_audit").insert({
            "incident_id": incident_id,
            "action": action,
            "actor": fields.pop("actor", "ai"),
            **fields,
        }).execute()
    except Exception as e:
        logger.warning("Failed to write audit log: %s", e)


async def process_article(item: ApifyWebhookItem) -> None:
    client, model = _get_client_and_model()
    if client is None:
        logger.warning("No AI provider configured — skipping %s", item.url)
        return

    db = get_db()

    # ---- 0. Dedup by URL ----
    existing = db.table("sources").select("id").eq("url", item.url).execute()
    if existing.data:
        logger.debug("Already processed: %s", item.url)
        return

    # ---- 1. Claude extraction ----
    schemes_block = _load_dmk_schemes_for_prompt(db)
    prompt = EXTRACTION_PROMPT.format(
        url=item.url,
        source=item.source or "unknown",
        published=item.published_at or "?",
        title=item.title,
        text=(item.text or "")[:8000],
        dmk_schemes=schemes_block,
        today=date.today().isoformat(),
    )

    try:
        response = client.chat.completions.create(
            model=model,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        raw = _strip_code_fences(response.choices[0].message.content)
        extracted = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("AI returned invalid JSON for %s: %s", item.url, e)
        return
    except Exception as e:
        logger.error("Claude call failed for %s: %s", item.url, e)
        return

    if not extracted.get("is_relevant"):
        logger.debug("Not relevant: %s", item.url)
        return

    # ---- 2. Record source ----
    tier = getattr(item, "tier", None) or "established_press"
    image_urls = getattr(item, "image_urls", None) or []
    db.table("sources").insert({
        "url": item.url,
        "outlet": item.source or "unknown",
        "title": item.title,
        "credibility_tier": tier,
    }).execute()

    # ---- 3. Multi-source verification gate ----
    signature = _event_signature(extracted)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

    similar = (
        db.table("incidents")
        .select("id, source_urls, source_count, verification_status, ai_confidence")
        .eq("event_signature", signature)
        .gte("created_at", cutoff)
        .execute()
    )

    confidence = extracted.get("confidence", 0.5)

    if similar.data:
        # Found an existing incident matching this event → add this source
        target = similar.data[0]
        new_sources = list(set((target.get("source_urls") or []) + [item.url]))
        new_count = len(new_sources)

        # Cross-source verification: distinct outlets are stronger than dup-outlet
        distinct_outlets = (
            db.table("sources")
            .select("outlet", count="exact")
            .in_("url", new_sources)
            .execute()
        )
        outlet_count = distinct_outlets.count or new_count

        new_status = "multi_source_verified" if outlet_count >= 2 else "pending_verification"

        db.table("incidents").update({
            "source_urls": new_sources,
            "source_count": new_count,
            "verification_status": new_status,
            "status": "approved" if new_status == "multi_source_verified" else "pending_review",
            # Keep highest confidence
            "ai_confidence": max(target.get("ai_confidence") or 0, confidence),
        }).eq("id", target["id"]).execute()

        _record_audit(
            db, target["id"], "source_added",
            from_value=str(target.get("source_count") or 1),
            to_value=str(new_count),
            metadata={"new_source": item.url, "verification_status": new_status},
        )
        logger.info("Cross-reference: %s now at %d sources [%s]", signature, new_count, new_status)
        return

    # ---- 4. First sighting of this event — insert as pending_verification ----
    verification_status = "pending_verification"
    publish_status = "pending_review"  # not yet shown publicly

    incident_payload = {
        "title": extracted["title"],
        "summary": extracted["summary"],
        "category": extracted["category"],
        "incident_date": extracted.get("incident_date", date.today().isoformat()),
        "location": extracted.get("location"),
        "source_urls": [item.url],
        "source_count": 1,
        "is_credit_steal": extracted.get("is_credit_steal", False),
        "original_credit": extracted.get("original_credit"),
        "related_dmk_scheme": extracted.get("related_dmk_scheme"),
        "severity": extracted.get("severity", 1),
        "ai_confidence": confidence,
        "member_ids": [],
        "status": publish_status,
        "verification_status": verification_status,
        "event_signature": signature,
        "image_urls": image_urls,
        "ai_raw": extracted,
    }

    inserted = db.table("incidents").insert(incident_payload).execute()
    if not inserted.data:
        logger.error("Insert failed for %s", item.url)
        return
    incident_id = inserted.data[0]["id"]

    _record_audit(
        db, incident_id, "created",
        to_value=verification_status,
        metadata={"category": extracted["category"], "confidence": confidence},
    )

    # ---- 5. Best-effort: fact-check lookup (async, non-blocking on failure) ----
    try:
        factchecks = lookup_factchecks(extracted["title"], (extracted.get("people_mentioned") or [])[:3])
        if factchecks:
            db.table("incidents").update({"related_factchecks": factchecks}).eq("id", incident_id).execute()
            logger.info("Attached %d factchecks to %s", len(factchecks), incident_id)
    except Exception as e:
        logger.warning("Factcheck lookup failed for %s: %s", incident_id, e)

    # ---- 6. Best-effort: image suspicion check ----
    if image_urls:
        try:
            enqueue_images(db, incident_id, image_urls)
        except Exception as e:
            logger.warning("Image check failed for %s: %s", incident_id, e)

    logger.info(
        "Saved [%s] conf=%.2f sig=%s: %s",
        verification_status, confidence, signature, extracted["title"],
    )
