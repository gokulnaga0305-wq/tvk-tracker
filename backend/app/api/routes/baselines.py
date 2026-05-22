"""DMK-era baseline numbers used for delta-vs-current comparison."""
from fastapi import APIRouter, HTTPException, Header
from app.database import get_db
from app.config import settings
from typing import Optional

router = APIRouter(prefix="/baselines", tags=["baselines"])


@router.get("/")
async def list_baselines(category: Optional[str] = None):
    db = get_db()
    q = db.table("baselines").select("*")
    if category:
        q = q.eq("category", category)
    res = q.order("category").execute()
    return res.data or []


@router.get("/dashboard")
async def dashboard_baselines_with_deltas():
    """Returns DMK baseline + current TVK count + delta for each category."""
    db = get_db()
    baselines = db.table("baselines").select("*").execute().data or []
    out = []
    for b in baselines:
        # Count current TVK-era incidents in this category
        current_res = (
            db.table("incidents")
            .select("id", count="exact")
            .eq("category", b["category"])
            .eq("status", "approved")
            .gte("incident_date", "2026-05-11")
            .execute()
        )
        current = current_res.count or 0

        # The baseline is per-month average. Pro-rate it to days elapsed under TVK.
        from datetime import date
        days_under_tvk = max(1, (date.today() - settings.govt_start_date).days)
        # 30-day months, so current period equivalent baseline:
        baseline_month_avg = float(b.get("dmk_monthly_avg") or 0)
        expected = round(baseline_month_avg * (days_under_tvk / 30.0), 1)
        delta_pct = None
        if expected > 0:
            delta_pct = round((current - expected) / expected * 100, 1)

        out.append({
            "category": b["category"],
            "label": b.get("label"),
            "dmk_monthly_avg": baseline_month_avg,
            "dmk_source": b.get("source"),
            "dmk_period": b.get("period"),
            "tvk_count": current,
            "tvk_period_days": days_under_tvk,
            "expected_at_dmk_rate": expected,
            "delta_pct": delta_pct,
        })
    return out


@router.post("/")
async def upsert_baseline(
    category: str,
    label: str,
    dmk_monthly_avg: float,
    source: str,
    period: str,
    x_admin_secret: str = Header(...),
):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    res = db.table("baselines").upsert({
        "category": category,
        "label": label,
        "dmk_monthly_avg": dmk_monthly_avg,
        "source": source,
        "period": period,
    }).execute()
    return res.data[0] if res.data else {}
