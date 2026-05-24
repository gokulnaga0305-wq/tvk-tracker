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
from app.ingestion.archive_lookup import find_precedents, attach_evidence
from app.ingestion.corroboration import attempt_corroborate

logger = logging.getLogger(__name__)

GOVT_START = "May 11, 2026"

SYSTEM_PROMPT = f"""You are a fact-checking analyst for a Tamil Nadu accountability dashboard.

CONTEXT:
- The TVK (Tamilaga Vettri Kazhagam) government under CM Vijay took office on {GOVT_START}.
- We track SPECIFIC INCIDENTS that count as governance failures, crimes, broken
  promises, or credit stealing — NOT general political news or commentary.
- The previous DMK government (under M.K. Stalin, 2021-2026) launched many welfare
  schemes. Flag "credit stealing" when TVK renames, expands, or relaunches these
  without acknowledgement.

CRITICAL: be STRICT. Set is_relevant=false aggressively. Most articles are political
narrative, not incidents. Only track articles describing a concrete event with a
named victim/perpetrator/place OR a specific policy decision with concrete impact.

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

RELEVANCE RULES (be STRICT — when in doubt, set is_relevant=FALSE):

✅ TRACK these (is_relevant=true):
  - Crime against a specific person/group with named victim or location
    (murder, rape, assault, custodial death, communal/caste attack)
  - Named corruption case: bribe demand, scam, FIR filed, vigilance arrest,
    tender irregularity with named amount
  - Specific civic failure with named place + measurable impact: power cut
    > 3 hours in named area, water shortage, flooding, sewage backup,
    hospital oxygen shortage
  - Specific TVK policy decision with concrete impact: scheme launch,
    scheme cancellation, budget cut, fare hike, license revocation
  - Broken/delayed manifesto promise (named promise + deadline)
  - Credit stealing: TVK announcing scheme that matches DMK registry above
  - Press freedom: named journalist arrested/raided, named media outlet
    sealed
  - AI-generated or doctored image flagged in news with debunk

❌ SKIP these (is_relevant=false):
  - Cabinet appointments, portfolio allocations, swearing-in (NOT incidents)
  - Party alliances forming/breaking (politics, not failure)
  - Generic CM/Minister speeches at events or press conferences
  - Opinion pieces, editorials, columnist takes
  - "X criticised Y" / "X said Y said" — pure he-said-she-said
  - Election commentary that's not a court ruling against TVK
  - Stalin's or DMK's reactions (we track DMK-era proof, not DMK's words)
  - Hindi-Tamil debates unless a specific imposition order exists
  - Movie/celebrity/sports/entertainment (even if Vijay is mentioned)
  - National news (Modi, BJP, RSS, parliament) unless directly affecting TN
  - Weather forecasts alone (only flood/power-failure CONSEQUENCES count)
  - VCK/Congress joining TVK = alliance news, NOT incident
  - "AIADMK leader exits party" = party politics, NOT TVK incident
  - General investment summits, MoU signings without delivery problems

EXAMPLES (study these carefully):
  EX 1: "TVK Cabinet Expansion to 33 Ministers; Congress Joins"
    → is_relevant=FALSE. Cabinet news, no incident.

  EX 2: "Erode contract employee suspended for demanding Rs 500 bribe"
    → is_relevant=TRUE, category=corruption, location=Erode, severity=2.

  EX 3: "CM Vijay's appeal to children invites Madras HC PIL"
    → is_relevant=FALSE unless court has already ruled — currently just a
    petition. Track when verdict comes.

  EX 4: "Power cut for 6 hours in T. Nagar, residents protest"
    → is_relevant=TRUE, category=power_cut, location=T. Nagar, severity=3.

  EX 5: "Stalin urges DMK cadre to avoid harsh criticism of new govt"
    → is_relevant=FALSE. Politics. Not a TVK incident.

  EX 6: "TVK announces Rs 1500/month women's scheme, opposition flags
        similarity to Magalir Urimai"
    → is_relevant=TRUE, category=credit_stealing,
    related_dmk_scheme=Kalaignar Magalir Urimai Thittam.

  EX 7: "Foxconn announces new investment in Tamil Nadu"
    → is_relevant=TRUE only if TVK is taking credit OR if it's a
    cancellation/exit. Pure new MoU = false.

  EX 8: "TASMAC workers protest 717 shop closures"
    → is_relevant=TRUE, category=governance OR alcohol_menace
    (TVK policy with concrete worker impact).

  EX 9: "Honour killing in Tiruvannamalai: woman killed by family"
    → is_relevant=TRUE, category=honour_killing, severity=5.

  EX 10: "Vijay's Cabinet has record 7 SC community members"
    → is_relevant=FALSE. Composition news, not incident.

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


def analyze_only(*, url: str, source: str, title: str, text: str) -> dict:
    """Run the Claude extractor against an article WITHOUT writing anything
    to the database. Used by the admin quick-add form so the human can edit
    the AI's output before publishing.

    Raises RuntimeError if no AI provider is configured.
    Returns the raw `extracted` dict from the model.
    """
    client, model = _get_client_and_model()
    if client is None:
        raise RuntimeError("No AI provider configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY)")

    db = get_db()
    schemes_block = _load_dmk_schemes_for_prompt(db)
    prompt = EXTRACTION_PROMPT.format(
        url=url,
        source=source or "unknown",
        published=date.today().isoformat(),
        title=title,
        text=(text or "")[:8000],
        dmk_schemes=schemes_block,
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
    raw = _strip_code_fences(response.choices[0].message.content)
    extracted = json.loads(raw)

    # Best-effort: also attach fact-check matches so admin sees them in the form
    try:
        fc = lookup_factchecks(extracted.get("title") or title,
                                (extracted.get("people_mentioned") or [])[:3])
        if fc:
            extracted["related_factchecks"] = fc
    except Exception:
        pass

    return extracted


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
    # Signature = category:location:incident_date. Two articles about the same
    # event (e.g. a Reddit post and a Hindu article) get the same signature.
    #
    # Window extended from 48h → 30 DAYS so that an old single-source
    # pending_verification incident (e.g. a Reddit post from 2 weeks ago)
    # gets AUTO-PROMOTED to multi_source_verified when a press source today
    # reports the same event. This is the "truth-first" cross-reference loop.
    signature = _event_signature(extracted)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

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

    # ---- 4. First sighting of this event — decide auto-publish vs queue ----
    # Rule: high-tier outlet (primary/established_press) + AI confidence ≥ 0.7
    # is good enough to auto-publish as single-source. Future articles from
    # other outlets graduate it to multi_source_verified.
    HIGH_TIER = {"primary", "established_press"}
    if tier in HIGH_TIER and confidence >= 0.7:
        verification_status = "pending_verification"  # waiting for cross-ref
        publish_status = "approved"                    # but show publicly meanwhile
    else:
        verification_status = "pending_verification"
        publish_status = "pending_review"  # held back from public view

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

    # ---- 7. DMK archive cross-reference (only for credit-steal candidates) ----
    if extracted.get("is_credit_steal") or extracted.get("related_dmk_scheme"):
        try:
            precedents = find_precedents(
                incident_title=extracted["title"],
                incident_summary=extracted["summary"],
                related_scheme=extracted.get("related_dmk_scheme"),
                limit=5,
            )
            attached = attach_evidence(incident_id, precedents)
            if attached:
                logger.info(
                    "Cross-ref: attached %d DMK archive precedents to %s",
                    attached, incident_id,
                )
        except Exception as e:
            logger.warning("Archive cross-ref failed for %s: %s", incident_id, e)

    logger.info(
        "Saved [%s] conf=%.2f sig=%s: %s",
        verification_status, confidence, signature, extracted["title"],
    )

    # ---- 8. IMMEDIATE corroboration attempt (no waiting for nightly sweep) ----
    # As soon as we save a pending incident, search Google News for press
    # coverage. If 2+ press outlets are already reporting the same event,
    # the incident graduates to multi_source_verified before the user even
    # refreshes the dashboard. This is what makes the dashboard 'live truth'
    # instead of 'truth at 9 AM tomorrow'.
    if verification_status == "pending_verification":
        try:
            # Re-fetch the row so attempt_corroborate has the canonical source_urls
            fresh = (
                db.table("incidents")
                .select("id, title, summary, location, incident_date, source_urls, verification_status")
                .eq("id", incident_id)
                .single()
                .execute()
            )
            if fresh.data:
                outcome = attempt_corroborate(fresh.data)
                if outcome.get("promoted"):
                    logger.info(
                        "Live-corroborated [%s] via %s",
                        incident_id, ",".join(outcome.get("matched_outlets") or [])
                    )
        except Exception as e:
            # Never let corroboration failure break the ingestion path
            logger.warning("Live corroboration failed for %s: %s", incident_id, e)
