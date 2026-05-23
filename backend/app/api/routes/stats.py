from fastapi import APIRouter
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/stats", tags=["stats"])

# Categories we count for the dashboard. Each one is counted by:
#   (a) primary category match  OR
#   (b) extra tag in ai_raw.tags_extra
TRACKED_CATEGORIES = [
    "corruption", "murders", "sexual_assault", "crimes_women_kids",
    "power_cut", "eb_failure", "alcohol_menace", "honour_killing",
    "police_excess", "broken_promise", "attack_on_press", "fake_news",
    "custodial_death",
]


@router.get("/dashboard")
async def get_dashboard_stats():
    """Top-line dashboard counters.

    Performance: previously made 29 sequential Supabase queries (13 categories
    × 2 calls each + 3 misc), taking ~9s warm. Now does TWO queries — one for
    all approved incidents (category + ai_raw), one for all promises — and
    counts in Python. Typical response time: ~600ms warm.
    """
    db = get_db()

    # Single query: all approved incidents with the columns we need to count
    incidents_res = (
        db.table("incidents")
        .select("category, is_credit_steal, ai_raw")
        .eq("status", "approved")
        .execute()
    )
    incidents = incidents_res.data or []

    # Build category counter — incident counts toward category if its primary
    # category matches OR if `ai_raw.tags_extra` contains the category. We
    # use a set per-incident so a single record isn't double-counted.
    counts = {c: 0 for c in TRACKED_CATEGORIES}
    credit_steal_count = 0

    for inc in incidents:
        if inc.get("is_credit_steal"):
            credit_steal_count += 1

        # Collect every category that should claim this incident
        claims = set()
        primary = inc.get("category")
        if primary:
            claims.add(primary)
        raw = inc.get("ai_raw") or {}
        if isinstance(raw, dict):
            for t in raw.get("tags_extra", []) or []:
                if isinstance(t, str):
                    claims.add(t)
        for c in claims:
            if c in counts:
                counts[c] += 1

    # Promises (single query)
    promises_res = db.table("promises").select("status").execute()
    promises = promises_res.data or []
    kept = sum(1 for p in promises if p.get("status") == "kept")

    return {
        "govt_day":                 settings.govt_day_number,
        "corruption_count":         counts["corruption"],
        "murders_count":            counts["murders"],
        "sexual_assault_count":     counts["sexual_assault"],
        "crimes_women_kids_count":  counts["crimes_women_kids"],
        "power_cut_count":          counts["power_cut"],
        "eb_failure_count":         counts["eb_failure"],
        "alcohol_menace_count":     counts["alcohol_menace"],
        "honour_killing_count":     counts["honour_killing"],
        "police_excess_count":      counts["police_excess"],
        "broken_promise_count":     counts["broken_promise"],
        "attack_on_press_count":    counts["attack_on_press"],
        "fake_news_count":          counts["fake_news"],
        "custodial_death_count":    counts["custodial_death"],
        "credit_steal_count":       credit_steal_count,
        "promises_kept":            kept,
        "promises_total":           len(promises),
        "total_incidents":          len(incidents),
    }
