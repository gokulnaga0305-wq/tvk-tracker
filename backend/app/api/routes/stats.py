from fastapi import APIRouter
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard")
async def get_dashboard_stats():
    """Top-line dashboard counters. Counts approved incidents per category
    AND counts incidents whose ai_raw.tags_extra includes the category — so a
    governance-primary incident tagged with power_cut still shows in
    power_cut counter."""
    db = get_db()

    def count_category(category: str) -> int:
        """Count primary-category matches + tags_extra matches.
        The DB query uses Postgres' jsonb @> operator via PostgREST cs filter."""
        # Primary category
        primary = (
            db.table("incidents")
            .select("id", count="exact")
            .eq("category", category)
            .eq("status", "approved")
            .execute()
        )
        primary_count = primary.count or 0
        # tags_extra in ai_raw — only count if NOT already in primary
        try:
            # PostgREST contains filter: ai_raw->tags_extra ? 'value'
            # Using cs (contains) with stringified JSON path is fragile; fall back to
            # client-side dedup count via wildcard.
            tagged = (
                db.table("incidents")
                .select("id,category")
                .neq("category", category)  # exclude already-counted primary
                .eq("status", "approved")
                .like("ai_raw->>tags_extra", f"%{category}%")
                .execute()
            )
            extra_count = len(tagged.data or [])
        except Exception:
            extra_count = 0
        return primary_count + extra_count

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

    return {
        "govt_day": settings.govt_day_number,
        "corruption_count":         count_category("corruption"),
        "murders_count":            count_category("murders"),
        "sexual_assault_count":     count_category("sexual_assault"),
        "crimes_women_kids_count":  count_category("crimes_women_kids"),
        "power_cut_count":          count_category("power_cut"),
        "eb_failure_count":         count_category("eb_failure"),
        "alcohol_menace_count":     count_category("alcohol_menace"),
        "honour_killing_count":     count_category("honour_killing"),
        "police_excess_count":      count_category("police_excess"),
        "broken_promise_count":     count_category("broken_promise"),
        "attack_on_press_count":    count_category("attack_on_press"),
        "fake_news_count":          count_category("fake_news"),
        "custodial_death_count":    count_category("custodial_death"),
        "credit_steal_count":       credit_res.count or 0,
        "promises_kept":            kept,
        "promises_total":           len(promises),
        "total_incidents":          total_res.count or 0,
    }
