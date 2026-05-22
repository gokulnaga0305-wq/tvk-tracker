"""DMK-era baseline numbers used for delta-vs-current comparison.

Baselines are static public NCRB / govt-portal figures. We keep them in
code rather than a DB table so:
  - they're version-controlled and auditable
  - no migration needed to deploy
  - cheap reads (no DB query on dashboard load)

To update a number: edit BASELINES dict + commit. Each entry cites its
public source explicitly.
"""
from datetime import date
from fastapi import APIRouter
from app.database import get_db
from app.config import settings
from typing import Optional

router = APIRouter(prefix="/baselines", tags=["baselines"])


# All monthly averages refer to Tamil Nadu state-wide totals during the
# DMK final year (2023 calendar) unless noted otherwise. Sources are
# public and citable.
BASELINES: list[dict] = [
    {
        "category": "murders",
        "label": "Murders",
        "dmk_monthly_avg": 227.0,
        "source": "NCRB Crime in India 2023, TN state data (2,725 murders / 12)",
        "period": "2023 annual average",
        "notes": "Tamil Nadu had 2,725 murders in 2023; ~227/month",
    },
    {
        "category": "sexual_assault",
        "label": "Sexual Assaults",
        "dmk_monthly_avg": 105.0,
        "source": "NCRB Crime in India 2023, IPC 376 (rapes) — 1,261 / 12",
        "period": "2023 annual average",
        "notes": "TN reported 1,261 rapes in 2023",
    },
    {
        "category": "crimes_women_kids",
        "label": "Crimes vs Women & Children",
        "dmk_monthly_avg": 1850.0,
        "source": "NCRB 2023: TN crimes-against-women + POCSO combined",
        "period": "2023 annual average",
        "notes": "~22,200 cases/yr",
    },
    {
        "category": "corruption",
        "label": "Corruption cases",
        "dmk_monthly_avg": 37.0,
        "source": "TN Directorate of Vigilance and Anti-Corruption annual report 2023",
        "period": "2023 annual average",
        "notes": "~445 cases registered in 2023",
    },
    {
        "category": "custodial_death",
        "label": "Custodial deaths",
        "dmk_monthly_avg": 1.0,
        "source": "NHRC TN data 2023",
        "period": "2023 annual average",
        "notes": "~12 custodial deaths in TN 2023",
    },
    {
        "category": "honour_killing",
        "label": "Honour killings",
        "dmk_monthly_avg": 1.2,
        "source": "Madras HC + Evidence NGO compilation 2023",
        "period": "2023 estimate",
        "notes": "~14 reported honour killings in TN 2023",
    },
    {
        "category": "police_excess",
        "label": "Police excess incidents",
        "dmk_monthly_avg": 5.0,
        "source": "PUCL TN annual review + news compilation 2023",
        "period": "2023 estimate",
        "notes": "~60 reported incidents in 2023",
    },
    {
        "category": "communal_violence",
        "label": "Communal incidents",
        "dmk_monthly_avg": 2.5,
        "source": "TN police communal incidents register 2023",
        "period": "2023 estimate",
        "notes": "~30 incidents in 2023",
    },
    {
        "category": "industrial_flight",
        "label": "Companies leaving TN",
        "dmk_monthly_avg": 0.2,
        "source": "TIDCO + industry chamber records 2023",
        "period": "2023 annual /12",
        "notes": "Only 2 announced exits in 2023 under DMK",
    },
]

BASELINE_LOOKUP = {b["category"]: b for b in BASELINES}


@router.get("/")
async def list_baselines(category: Optional[str] = None):
    if category:
        b = BASELINE_LOOKUP.get(category)
        return [b] if b else []
    return BASELINES


@router.get("/dashboard")
async def dashboard_baselines_with_deltas():
    """Returns DMK baseline + current TVK count + delta for each category."""
    db = get_db()
    days_under_tvk = max(1, (date.today() - settings.govt_start_date).days)

    out = []
    for b in BASELINES:
        try:
            current_res = (
                db.table("incidents")
                .select("id", count="exact")
                .eq("category", b["category"])
                .eq("status", "approved")
                .gte("incident_date", settings.govt_start_date.isoformat())
                .execute()
            )
            current = current_res.count or 0
        except Exception:
            current = 0

        baseline_month_avg = float(b["dmk_monthly_avg"])
        expected = round(baseline_month_avg * (days_under_tvk / 30.0), 1)
        delta_pct = None
        if expected > 0:
            delta_pct = round((current - expected) / expected * 100, 1)

        out.append({
            "category": b["category"],
            "label": b["label"],
            "dmk_monthly_avg": baseline_month_avg,
            "dmk_source": b["source"],
            "dmk_period": b["period"],
            "tvk_count": current,
            "tvk_period_days": days_under_tvk,
            "expected_at_dmk_rate": expected,
            "delta_pct": delta_pct,
        })
    return out
