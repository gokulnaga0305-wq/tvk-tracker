from fastapi import APIRouter
from app.database import get_db
from app.models.schemas import DashboardStats
from app.config import settings

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    db = get_db()

    def count(category: str) -> int:
        res = (
            db.table("incidents")
            .select("id", count="exact")
            .eq("category", category)
            .eq("status", "approved")
            .execute()
        )
        return res.count or 0

    credit_res = (
        db.table("incidents")
        .select("id", count="exact")
        .eq("is_credit_steal", True)
        .eq("status", "approved")
        .execute()
    )

    total_res = (
        db.table("incidents")
        .select("id", count="exact")
        .eq("status", "approved")
        .execute()
    )

    promises_res = db.table("promises").select("status").execute()
    promises = promises_res.data or []
    kept = sum(1 for p in promises if p["status"] == "kept")

    return DashboardStats(
        govt_day=settings.govt_day_number,
        corruption_count=count("corruption"),
        murders_count=count("murders"),
        sexual_assault_count=count("sexual_assault"),
        crimes_women_kids_count=count("crimes_women_kids"),
        credit_steal_count=credit_res.count or 0,
        promises_kept=kept,
        promises_total=len(promises),
        total_incidents=total_res.count or 0,
    )
