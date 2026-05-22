from fastapi import APIRouter, HTTPException, Query, Header
from app.database import get_db
from app.models.schemas import IncidentCreate, IncidentOut, IncidentUpdate, IncidentStatus
from app.config import settings
from typing import Optional

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("/", response_model=list[dict])
async def list_incidents(
    category: Optional[str] = None,
    is_credit_steal: Optional[bool] = None,
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

    res = query.order("incident_date", desc=True).range(offset, offset + limit - 1).execute()
    return res.data or []


@router.get("/{incident_id}", response_model=dict)
async def get_incident(incident_id: str):
    db = get_db()
    res = db.table("incidents").select("*").eq("id", incident_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    return res.data


@router.post("/", response_model=dict, status_code=201)
async def create_incident(body: IncidentCreate, x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    payload = body.model_dump()
    payload["status"] = "approved"
    payload["incident_date"] = payload["incident_date"].isoformat()
    res = db.table("incidents").insert(payload).execute()
    return res.data[0]


@router.patch("/{incident_id}", response_model=dict)
async def update_incident(incident_id: str, body: IncidentUpdate, x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    updates = body.model_dump(exclude_none=True)
    res = db.table("incidents").update(updates).eq("id", incident_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    return res.data[0]


@router.delete("/{incident_id}", status_code=204)
async def delete_incident(incident_id: str, x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    db.table("incidents").delete().eq("id", incident_id).execute()
