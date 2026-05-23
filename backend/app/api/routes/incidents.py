from fastapi import APIRouter, HTTPException, Query, Header
from app.database import get_db
from app.models.schemas import IncidentCreate, IncidentUpdate
from app.config import settings
from typing import Optional

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _enrich_sources(db, incidents: list[dict]) -> list[dict]:
    """Attach outlet info + credibility tier to each incident's source_urls."""
    if not incidents:
        return incidents
    all_urls = list({u for inc in incidents for u in (inc.get("source_urls") or [])})
    if all_urls:
        res = db.table("sources").select("url,outlet,credibility_tier,title").in_("url", all_urls).execute()
        source_lookup = {s["url"]: s for s in (res.data or [])}
        for inc in incidents:
            inc["sources"] = [
                source_lookup.get(u, {"url": u, "outlet": "unknown", "credibility_tier": "unknown"})
                for u in (inc.get("source_urls") or [])
            ]
    return incidents


def _normalize_tags(incidents: list[dict]) -> list[dict]:
    """Ensure every incident has a `tags` array. Falls back to [category]
    if the DB doesn't have the column yet (pre-migration 008)."""
    for inc in incidents:
        if inc.get("tags") is None or inc.get("tags") == []:
            cat = inc.get("category")
            inc["tags"] = [cat] if cat else []
        # Also pull extra tags out of ai_raw if present
        raw = inc.get("ai_raw") or {}
        extra = raw.get("tags_extra") or []
        for t in extra:
            if t not in inc["tags"]:
                inc["tags"].append(t)
    return incidents


def _enrich_dmk_evidence(db, incidents: list[dict]) -> list[dict]:
    """Bulk-load top-3 DMK precedents for credit-steal incidents."""
    credit_steal_ids = [inc["id"] for inc in incidents if inc.get("is_credit_steal")]
    if not credit_steal_ids:
        return incidents
    try:
        res = (
            db.table("incident_dmk_evidence")
            .select(
                "incident_id,match_score,match_reason,"
                "announcement:dmk_announcements("
                "id,title,content,source,source_url,announcement_date,media_urls"
                ")"
            )
            .in_("incident_id", credit_steal_ids)
            .order("match_score", desc=True)
            .execute()
        )
        by_incident: dict[str, list] = {}
        for ev in res.data or []:
            by_incident.setdefault(ev["incident_id"], []).append(ev)
        for inc in incidents:
            if inc.get("is_credit_steal"):
                inc["dmk_evidence"] = by_incident.get(inc["id"], [])[:3]
    except Exception:
        # If the evidence table doesn't exist yet (pre-migration), don't break the list
        pass
    return incidents


@router.get("/", response_model=list[dict])
async def list_incidents(
    category: Optional[str] = None,
    is_credit_steal: Optional[bool] = None,
    verification_status: Optional[str] = None,
    status: str = "approved",
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    db = get_db()
    query = db.table("incidents").select("*").eq("status", status)

    if category:
        query = query.eq("category", category)
    if is_credit_steal is not None:
        query = query.eq("is_credit_steal", is_credit_steal)
    if verification_status:
        query = query.eq("verification_status", verification_status)

    res = query.order("incident_date", desc=True).range(offset, offset + limit - 1).execute()
    data = res.data or []
    data = _enrich_sources(db, data)
    data = _enrich_dmk_evidence(db, data)
    data = _normalize_tags(data)
    return data


@router.get("/{incident_id}", response_model=dict)
async def get_incident(incident_id: str):
    """Return incident + linked DMK precedents + audit log."""
    db = get_db()
    res = db.table("incidents").select("*").eq("id", incident_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident = res.data

    # Enrich with source outlet info
    incident = _enrich_sources(db, [incident])[0]

    # DMK precedents (cross-reference evidence)
    evidence = (
        db.table("incident_dmk_evidence")
        .select(
            "match_score,match_reason,announcement:dmk_announcements("
            "id,title,content,source,source_url,announcement_date,media_urls"
            ")"
        )
        .eq("incident_id", incident_id)
        .order("match_score", desc=True)
        .execute()
    )
    incident["dmk_evidence"] = evidence.data or []

    # Audit log
    audit = (
        db.table("incident_audit")
        .select("action,from_value,to_value,actor,reason,created_at,metadata")
        .eq("incident_id", incident_id)
        .order("created_at", desc=False)
        .execute()
    )
    incident["audit_log"] = audit.data or []

    return incident


@router.post("/", response_model=dict, status_code=201)
async def create_incident(body: IncidentCreate, x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    payload = body.model_dump(exclude_none=True)
    payload["status"] = "approved"
    payload["verification_status"] = "admin_verified"
    payload["incident_date"] = payload["incident_date"].isoformat()
    payload["source_count"] = len(payload.get("source_urls") or []) or 1
    res = db.table("incidents").insert(payload).execute()
    incident_id = res.data[0]["id"]

    # Audit log
    db.table("incident_audit").insert({
        "incident_id": incident_id,
        "action": "created",
        "to_value": "admin_verified",
        "actor": "admin",
        "reason": "manual creation via API",
    }).execute()

    # Credit-steal incidents get DMK archive cross-reference
    if payload.get("is_credit_steal") or payload.get("related_dmk_scheme"):
        try:
            from app.ingestion.archive_lookup import find_precedents, attach_evidence
            precedents = find_precedents(
                incident_title=payload["title"],
                incident_summary=payload["summary"],
                related_scheme=payload.get("related_dmk_scheme"),
                limit=5,
            )
            attach_evidence(incident_id, precedents)
        except Exception:
            pass  # Non-fatal — admin can re-trigger later if needed

    return res.data[0]


@router.patch("/{incident_id}", response_model=dict)
async def update_incident(incident_id: str, body: IncidentUpdate, x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    existing = db.table("incidents").select("*").eq("id", incident_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    updates = body.model_dump(exclude_none=True)
    res = db.table("incidents").update(updates).eq("id", incident_id).execute()

    # Audit log status change
    if "status" in updates and updates["status"] != existing.data.get("status"):
        db.table("incident_audit").insert({
            "incident_id": incident_id,
            "action": "status_change",
            "from_value": existing.data.get("status"),
            "to_value": updates["status"],
            "actor": "admin",
        }).execute()

    return res.data[0]


@router.post("/{incident_id}/verify", response_model=dict)
async def admin_verify(incident_id: str, x_admin_secret: str = Header(...)):
    """Admin manually verifies a pending_verification incident."""
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    res = db.table("incidents").update({
        "status": "approved",
        "verification_status": "admin_verified",
    }).eq("id", incident_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.table("incident_audit").insert({
        "incident_id": incident_id,
        "action": "verified",
        "to_value": "admin_verified",
        "actor": "admin",
    }).execute()
    return res.data[0]


@router.post("/{incident_id}/retract", response_model=dict)
async def retract_incident(
    incident_id: str,
    reason: str,
    x_admin_secret: str = Header(...),
):
    """Mark incident as retracted with a public reason — never deleted."""
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    from datetime import datetime, timezone
    res = db.table("incidents").update({
        "verification_status": "retracted",
        "retraction_reason": reason,
        "retracted_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", incident_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.table("incident_audit").insert({
        "incident_id": incident_id,
        "action": "retracted",
        "to_value": "retracted",
        "actor": "admin",
        "reason": reason,
    }).execute()
    return res.data[0]


@router.delete("/{incident_id}", status_code=204)
async def delete_incident(incident_id: str, x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    db.table("incidents").delete().eq("id", incident_id).execute()
