from fastapi import APIRouter
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/stats", tags=["stats"])

# Categories we track on the dashboard. Each one is counted by either:
#   (a) primary category match, OR
#   (b) extra tag in ai_raw.tags_extra
TRACKED_CATEGORIES = [
    "corruption", "murders", "sexual_assault", "crimes_women_kids",
    "power_cut", "eb_failure", "alcohol_menace", "honour_killing",
    "police_excess", "broken_promise", "attack_on_press", "fake_news",
    "custodial_death",
]

# Verification statuses that mean "press-confirmed or admin-reviewed truth".
# Anything else (pending_verification, retracted) is shown but NOT counted as
# verified — the dashboard exposes both numbers honestly so the user can see
# what's confirmed vs what's still single-source.
VERIFIED_STATUSES = {"multi_source_verified", "admin_verified"}


@router.get("/dashboard")
async def get_dashboard_stats():
    """Top-line dashboard counters with a verified/unverified split.

    Each category exposes:
      <category>_count            — total (verified + unverified)
      <category>_verified_count   — multi-source-verified or admin-verified

    Frontend can display "12 (8 verified)" honestly.

    Performance: previously 29 sequential Supabase queries (13 categories
    × 2 + 3 misc) taking ~9s warm. Now 2 queries total, ~600ms warm.
    """
    db = get_db()

    incidents_res = (
        db.table("incidents")
        .select("category, is_credit_steal, ai_raw, verification_status")
        .eq("status", "approved")
        .execute()
    )
    incidents = incidents_res.data or []

    counts_total = {c: 0 for c in TRACKED_CATEGORIES}
    counts_verified = {c: 0 for c in TRACKED_CATEGORIES}
    credit_total = 0
    credit_verified = 0
    verified_overall = 0

    for inc in incidents:
        verified = inc.get("verification_status") in VERIFIED_STATUSES
        if verified:
            verified_overall += 1

        if inc.get("is_credit_steal"):
            credit_total += 1
            if verified:
                credit_verified += 1

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
            if c in counts_total:
                counts_total[c] += 1
                if verified:
                    counts_verified[c] += 1

    promises_res = db.table("promises").select("status").execute()
    promises = promises_res.data or []
    kept = sum(1 for p in promises if p.get("status") == "kept")

    out = {
        "govt_day":                 settings.govt_day_number,
        # Total counts (kept for backwards-compat with existing frontend)
        "corruption_count":         counts_total["corruption"],
        "murders_count":            counts_total["murders"],
        "sexual_assault_count":     counts_total["sexual_assault"],
        "crimes_women_kids_count":  counts_total["crimes_women_kids"],
        "power_cut_count":          counts_total["power_cut"],
        "eb_failure_count":         counts_total["eb_failure"],
        "alcohol_menace_count":     counts_total["alcohol_menace"],
        "honour_killing_count":     counts_total["honour_killing"],
        "police_excess_count":      counts_total["police_excess"],
        "broken_promise_count":     counts_total["broken_promise"],
        "attack_on_press_count":    counts_total["attack_on_press"],
        "fake_news_count":          counts_total["fake_news"],
        "custodial_death_count":    counts_total["custodial_death"],
        "credit_steal_count":       credit_total,
        # Verified-only counts (the honest baseline)
        "corruption_verified":      counts_verified["corruption"],
        "murders_verified":         counts_verified["murders"],
        "sexual_assault_verified":  counts_verified["sexual_assault"],
        "crimes_women_kids_verified": counts_verified["crimes_women_kids"],
        "power_cut_verified":       counts_verified["power_cut"],
        "eb_failure_verified":      counts_verified["eb_failure"],
        "alcohol_menace_verified":  counts_verified["alcohol_menace"],
        "honour_killing_verified":  counts_verified["honour_killing"],
        "police_excess_verified":   counts_verified["police_excess"],
        "broken_promise_verified":  counts_verified["broken_promise"],
        "attack_on_press_verified": counts_verified["attack_on_press"],
        "fake_news_verified":       counts_verified["fake_news"],
        "custodial_death_verified": counts_verified["custodial_death"],
        "credit_steal_verified":    credit_verified,
        # Promise + overall totals
        "promises_kept":            kept,
        "promises_total":           len(promises),
        "total_incidents":          len(incidents),
        "verified_incidents":       verified_overall,
        "unverified_incidents":     len(incidents) - verified_overall,
    }
    return out
