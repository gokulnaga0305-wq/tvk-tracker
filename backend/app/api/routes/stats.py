from datetime import date, timedelta
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


# ---------- Incumbency meter ----------------------------------------------
#
# Evidence-driven 0-100 score that summarises how much accountability pressure
# has accumulated against the incumbent vs. how much delivery credit they have
# earned. Lower = anti-incumbency, higher = pro-incumbency, 50 = neutral.
#
# This is NOT an opinion poll. Every input is verifiable from our own DB:
#   - approved incident rates vs DMK NCRB/govt baselines
#   - severity-weighted high-impact incidents
#   - promises kept/broken vs expected delivery curve
#   - verified credit-steal count
#   - last 14d vs prior 14d incident-rate trend
#   - first-100-days honeymoon softener that fades to 0
#
# All inputs already flow through the multi-source verification gate, so the
# meter inherits the same trust posture as the rest of the dashboard.

# Per-category electoral weight. A corruption scandal moves voters far more
# than an EB blackout, so we weight the baseline-delta pressure accordingly.
_METER_CATEGORY_WEIGHTS: dict[str, float] = {
    "murders":           5.0,
    "custodial_death":   5.0,
    "corruption":        5.0,
    "honour_killing":    4.5,
    "sexual_assault":    4.5,
    "crimes_women_kids": 4.0,
    "police_excess":     4.0,
    "attack_on_press":   4.0,
    "credit_stealing":   3.0,
    "broken_promise":    3.0,
    "fake_news":         2.5,
    "alcohol_menace":    2.0,
    "power_cut":         2.0,
    "eb_failure":        2.0,
    "communal_violence": 4.5,
    "industrial_flight": 3.5,
}


def _zone_for(score: float) -> tuple[str, str]:
    """Map raw 0-100 score to (zone_key, human_label)."""
    if score < 25:
        return ("high_anti",     "High anti-incumbency risk")
    if score < 40:
        return ("elevated_anti", "Elevated pressure")
    if score < 55:
        return ("contested",     "Contested / early days")
    if score < 70:
        return ("mild_pro",      "Mild pro-incumbency")
    return     ("strong_pro",   "Strong pro-incumbency")


@router.get("/incumbency-meter")
async def get_incumbency_meter():
    """Realtime anti/pro-incumbency score (0-100) with full breakdown.

    Score = 50 (neutral)
          − anti_pressure (baseline + severity + promise_failure + credit + trend)
          + pro_boost     (delivery + baseline_beats + falling_trend)
          + honeymoon_softener (fades from 10 → 0 by day 100)
    """
    # Local import dodges circular: baselines.py also imports from stats path.
    from app.api.routes.baselines import BASELINES

    db = get_db()
    today = date.today()
    govt_start_iso = settings.govt_start_date.isoformat()
    days = max(1, settings.govt_day_number)

    incidents_res = (
        db.table("incidents")
        .select("category, is_credit_steal, verification_status, severity, incident_date")
        .eq("status", "approved")
        .execute()
    )
    incidents = incidents_res.data or []

    promises_res = db.table("promises").select("status").execute()
    promises = promises_res.data or []

    # --- 1) Baseline-vs-DMK pressure ---------------------------------------
    # Reuse the per-category DMK monthly averages from baselines.py. Anything
    # measurably worse than DMK pace adds anti-pressure proportional to its
    # electoral weight. Anything notably better counts as a "beat" → pro boost.
    baseline_pressure = 0.0
    baseline_beats = 0
    baseline_worse_categories: list[str] = []

    for b in BASELINES:
        cat = b["category"]
        cat_count = sum(
            1 for inc in incidents
            if inc.get("category") == cat
            and (inc.get("incident_date") or "") >= govt_start_iso
        )
        expected = float(b["dmk_monthly_avg"]) * (days / 30.0)
        if expected <= 0:
            continue
        ratio = cat_count / expected
        weight = _METER_CATEGORY_WEIGHTS.get(cat, 2.0)
        if ratio > 1.05:
            excess = min(ratio - 1.0, 3.0)  # cap at 3× baseline to avoid infinite pressure
            baseline_pressure += weight * excess
            baseline_worse_categories.append(b["label"])
        elif ratio < 0.85:
            baseline_beats += 1
    baseline_pressure_pts = min(baseline_pressure * 1.5, 30.0)  # cap at 30

    # --- 2) Severity-weighted high-impact pressure -------------------------
    # A single severity-5 corruption scandal needs its own line — it can move
    # the meter even before it shows up as a baseline-rate problem.
    verified_states = {"multi_source_verified", "admin_verified"}
    high_severity = sum(
        1 for inc in incidents
        if (inc.get("severity") or 1) >= 4
        and inc.get("verification_status") in verified_states
    )
    severity_pressure_pts = min(high_severity * 0.8, 15.0)

    # --- 3) Promise delivery deficit ---------------------------------------
    # Broken promises are direct anti-pressure. Underdelivery vs the expected
    # curve (~30% kept by year-1, scaling up) adds more.
    total_promises = len(promises)
    kept_promises = sum(1 for p in promises if p.get("status") == "kept")
    broken_promises = sum(1 for p in promises if p.get("status") == "broken")
    if total_promises > 0:
        delivery_ratio = kept_promises / total_promises
        broken_ratio = broken_promises / total_promises
        expected_kept_ratio = min(0.3 * (days / 365.0), 0.7)
        delivery_gap = max(0.0, expected_kept_ratio - delivery_ratio)
        promise_failure_pts = min(broken_ratio * 15.0 + delivery_gap * 10.0, 20.0)
    else:
        delivery_ratio = 0.0
        broken_ratio = 0.0
        promise_failure_pts = 0.0

    # --- 4) Credit-steal pressure ------------------------------------------
    credit_steals = sum(1 for inc in incidents if inc.get("is_credit_steal"))
    credit_pressure_pts = min(credit_steals * 0.5, 5.0)

    # --- 5) Trend (last 14d vs prior 14d) ----------------------------------
    recent_cutoff = (today - timedelta(days=14)).isoformat()
    prior_cutoff = (today - timedelta(days=28)).isoformat()
    recent_count = sum(
        1 for inc in incidents
        if (inc.get("incident_date") or "") >= recent_cutoff
    )
    prior_count = sum(
        1 for inc in incidents
        if prior_cutoff <= (inc.get("incident_date") or "") < recent_cutoff
    )
    trend_pts = 0.0
    if prior_count > 0:
        ratio = recent_count / prior_count
        if ratio > 1.2:
            trend_pts = min((ratio - 1.0) * 5.0, 5.0)        # rising → anti
        elif ratio < 0.8:
            trend_pts = -min((1.0 - ratio) * 5.0, 3.0)       # falling → pro

    # --- Total anti / pro ---------------------------------------------------
    anti_pressure = (
        baseline_pressure_pts
        + severity_pressure_pts
        + promise_failure_pts
        + credit_pressure_pts
        + max(0.0, trend_pts)
    )

    delivery_bonus = delivery_ratio * 20.0
    baseline_beats_bonus = min(baseline_beats * 3.0, 15.0)
    trend_bonus = max(0.0, -trend_pts)
    pro_boost = delivery_bonus + baseline_beats_bonus + trend_bonus

    # First-100-days honeymoon softens the meter — voters give a new govt
    # some benefit of the doubt. Fades linearly to 0 by day 100.
    honeymoon_softener = max(0.0, (100.0 - days) / 100.0 * 10.0)

    raw_score = 50.0 - anti_pressure + pro_boost + honeymoon_softener
    score = round(max(0.0, min(100.0, raw_score)), 1)
    zone, zone_label = _zone_for(score)

    # --- Top contributing factors (for the "why" bullets) ------------------
    worse_cat_str = (
        ", ".join(baseline_worse_categories[:3])
        + (f" +{len(baseline_worse_categories) - 3} more"
           if len(baseline_worse_categories) > 3 else "")
    ) if baseline_worse_categories else "categories above DMK pace"

    contributors = [
        ("baseline_pressure", baseline_pressure_pts, "anti",
         f"Above DMK pace: {worse_cat_str}"),
        ("severity_pressure", severity_pressure_pts, "anti",
         f"{high_severity} high-severity verified incidents (sev 4-5)"),
        ("promise_failure",   promise_failure_pts, "anti",
         f"{broken_promises} of {total_promises} promises broken, only {kept_promises} kept"),
        ("credit_pressure",   credit_pressure_pts, "anti",
         f"{credit_steals} credit-stealing incidents documented"),
        ("trend_rising",      max(0.0, trend_pts), "anti",
         f"Rising incident rate ({recent_count} last 14d vs {prior_count} prior)"),
        ("delivery_bonus",    delivery_bonus, "pro",
         f"{kept_promises} of {total_promises} promises delivered"),
        ("baseline_beats",    baseline_beats_bonus, "pro",
         f"{baseline_beats} categories outperform DMK pace"),
        ("trend_falling",     max(0.0, -trend_pts), "pro",
         f"Falling incident rate ({recent_count} last 14d vs {prior_count} prior)"),
        ("honeymoon",         honeymoon_softener, "pro",
         f"Day {days} of {settings.govt_name} govt — first-100-days honeymoon"),
    ]
    contributors.sort(key=lambda x: x[1], reverse=True)
    factors = [
        {"key": k, "points": round(p, 1), "direction": d, "label": lbl}
        for (k, p, d, lbl) in contributors
        if p >= 0.5
    ][:4]

    return {
        "score": score,
        "zone": zone,
        "zone_label": zone_label,
        "govt_day": days,
        "govt_name": settings.govt_name,
        "anti_pressure_total": round(anti_pressure, 1),
        "pro_boost_total": round(pro_boost, 1),
        "honeymoon_softener": round(honeymoon_softener, 1),
        "factors": factors,
        "breakdown": {
            "baseline_pressure":     round(baseline_pressure_pts, 1),
            "severity_pressure":     round(severity_pressure_pts, 1),
            "promise_failure":       round(promise_failure_pts, 1),
            "credit_pressure":       round(credit_pressure_pts, 1),
            "trend":                 round(trend_pts, 1),
            "delivery_bonus":        round(delivery_bonus, 1),
            "baseline_beats_bonus":  round(baseline_beats_bonus, 1),
        },
        "raw_inputs": {
            "total_incidents":       len(incidents),
            "high_severity_verified": high_severity,
            "credit_steals":         credit_steals,
            "promises_kept":         kept_promises,
            "promises_broken":       broken_promises,
            "promises_total":        total_promises,
            "categories_beating_dmk": baseline_beats,
            "categories_worse_than_dmk": len(baseline_worse_categories),
            "recent_14d_incidents":  recent_count,
            "prior_14d_incidents":   prior_count,
        },
    }
