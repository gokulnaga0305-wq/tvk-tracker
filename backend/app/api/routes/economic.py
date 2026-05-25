"""DMK-era sectoral GSDP/GSVA CAGR baselines, and the corresponding TVK
quarterly tracker.

Why a separate module from baselines.py
---------------------------------------
`baselines.py` tracks *crime/governance event counts* (e.g. murders/month).
Economic metrics are fundamentally different in shape:

  - they are continuous values (₹ lakh crore), not event counts
  - they are pro-rated over years, not days
  - the right comparison is "DMK 5-year CAGR vs TVK observed annualised rate
    using latest published quarterly GSVA"
  - their authoritative source is the TN Economic Survey + MoSPI sectoral
    GSVA series (released annually with quarterly advance estimates)

Treating them as a different "shape" keeps the data model honest and lets
the dashboard show two distinct panels: a crime-rate delta (event counts)
and a sectoral-economy delta (CAGR vs CAGR).

Data sources for DMK_CAGR_BASELINES
------------------------------------
Each entry cites its public, citable origin. Values are illustrative public
estimates derived from:

  * TN Economic Survey 2025-26 (Finance Dept, Govt of Tamil Nadu)
  * MoSPI State Domestic Product release, base year 2011-12
  * RBI Handbook of Statistics on Indian States (current series)
  * DPIIT FDI Quarterly Fact Sheet (FY22-Q1 through FY26-Q4)
  * TANGEDCO Annual Report (power capacity)
  * Guidance TN / TN Industrial Investment Promotion Bureau (MoU values)

When the user has the official PDFs at hand they should update each value
+ source URL — these are placeholders meant to be auditable and corrected
as authoritative numbers land. The admin upsert endpoint below allows
correcting numbers without redeploying.
"""
from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/economic", tags=["economic"])


# ---------- DMK SECTORAL CAGR BASELINES (FY22-FY26, 5 years) --------------
#
# CAGR formula reference: ((end / start) ** (1/years)) - 1
#
# Each entry shape:
#   key                : machine identifier (used as PK in tracker table)
#   label              : human label for UI
#   sector             : "agriculture" | "industry" | "services" | "headline" | "investment"
#   dmk_cagr_pct       : DMK-era CAGR for this sector (%, real terms unless noted)
#   dmk_period         : "FY22-FY26" period the CAGR covers
#   unit               : measurement unit
#   nominal            : True if value is nominal (not inflation-adjusted)
#   source             : primary citable source (text)
#   source_url         : URL to the source document if available
#   notes              : context / caveats

DMK_CAGR_BASELINES: list[dict] = [
    # ------ HEADLINE -----------------------------------------------------
    {
        "key": "gsdp_real_cagr",
        "label": "Total GSDP (real)",
        "sector": "headline",
        "dmk_cagr_pct": 8.4,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "TN Economic Survey 2025-26 + MoSPI State Series (base 2011-12)",
        "source_url": "https://www.tnsdc.in/economic-survey",
        "notes": "TN was India's #1 state GSDP by FY24 (~₹26 lakh cr nominal).",
    },
    {
        "key": "gsdp_nominal_cagr",
        "label": "Total GSDP (nominal)",
        "sector": "headline",
        "dmk_cagr_pct": 14.2,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": True,
        "source": "TN Finance Dept Budget at a Glance FY26",
        "source_url": "https://tnbudget.tn.gov.in/",
        "notes": "Reflects price + real growth combined.",
    },
    {
        "key": "per_capita_nsdp_cagr",
        "label": "Per-capita NSDP",
        "sector": "headline",
        "dmk_cagr_pct": 8.7,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI Per-capita NSDP series, TN",
        "source_url": "https://mospi.gov.in/statistics",
        "notes": "TN per-capita NSDP rose from ~₹2.25L to ~₹3.15L (real).",
    },
    # ------ AGRICULTURE & ALLIED -----------------------------------------
    {
        "key": "agriculture_cagr",
        "label": "Agriculture, Forestry, Fishing",
        "sector": "agriculture",
        "dmk_cagr_pct": 5.8,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Agriculture+Allied, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "Includes farming, livestock, fisheries, forestry.",
    },
    # ------ INDUSTRY -----------------------------------------------------
    {
        "key": "industry_total_cagr",
        "label": "Industry (total)",
        "sector": "industry",
        "dmk_cagr_pct": 7.2,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Industry (mfg + mining + utilities + construction)",
        "source_url": "https://mospi.gov.in/",
        "notes": "Aggregate industry sector incl. manufacturing.",
    },
    {
        "key": "manufacturing_cagr",
        "label": "Manufacturing",
        "sector": "industry",
        "dmk_cagr_pct": 7.8,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Manufacturing, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "TN remained India's #2 manufacturing state under DMK.",
    },
    {
        "key": "construction_cagr",
        "label": "Construction",
        "sector": "industry",
        "dmk_cagr_pct": 9.4,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Construction, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "Driven by metro, road, and industrial-corridor projects.",
    },
    {
        "key": "electricity_water_cagr",
        "label": "Electricity, Gas, Water",
        "sector": "industry",
        "dmk_cagr_pct": 6.1,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Electricity & Utilities, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "TANGEDCO capacity additions + renewables push.",
    },
    {
        "key": "mining_cagr",
        "label": "Mining & Quarrying",
        "sector": "industry",
        "dmk_cagr_pct": 3.2,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Mining, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "Modest growth (small base in TN).",
    },
    # ------ SERVICES -----------------------------------------------------
    {
        "key": "services_total_cagr",
        "label": "Services (total)",
        "sector": "services",
        "dmk_cagr_pct": 9.6,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Services, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "Services = >50% of TN GSDP under DMK.",
    },
    {
        "key": "trade_hotels_transport_cagr",
        "label": "Trade, Hotels, Transport, Comm.",
        "sector": "services",
        "dmk_cagr_pct": 9.8,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Trade/Hotels/Transport, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "Post-COVID tourism + retail rebound.",
    },
    {
        "key": "financial_realestate_cagr",
        "label": "Financial, Real Estate, Business",
        "sector": "services",
        "dmk_cagr_pct": 10.2,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Financial+RE+Business Services, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "Highest-growth services sub-sector under DMK.",
    },
    {
        "key": "public_admin_cagr",
        "label": "Public Administration",
        "sector": "services",
        "dmk_cagr_pct": 6.8,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Public Admin, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "Govt expenditure component of GSVA.",
    },
    {
        "key": "other_services_cagr",
        "label": "Other Services",
        "sector": "services",
        "dmk_cagr_pct": 8.4,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": False,
        "source": "MoSPI GSVA Other Services, TN",
        "source_url": "https://mospi.gov.in/",
        "notes": "Education, health, recreation, personal services.",
    },
    # ------ INVESTMENT & TRADE -------------------------------------------
    {
        "key": "fdi_inflow_cagr",
        "label": "FDI Equity Inflow",
        "sector": "investment",
        "dmk_cagr_pct": 18.5,
        "dmk_period": "FY22-FY25",
        "unit": "%",
        "nominal": True,
        "source": "DPIIT FDI Quarterly Fact Sheet, TN",
        "source_url": "https://dpiit.gov.in/publications/fdi-statistics",
        "notes": "TN ranked among India's top-2 FDI destinations under DMK.",
    },
    {
        "key": "exports_cagr",
        "label": "Merchandise Exports",
        "sector": "investment",
        "dmk_cagr_pct": 11.6,
        "dmk_period": "FY22-FY25",
        "unit": "%",
        "nominal": True,
        "source": "DGCI&S exports by state, TN",
        "source_url": "https://commerce.gov.in/",
        "notes": "TN consistently #2-3 exporting state under DMK.",
    },
    {
        "key": "tax_revenue_cagr",
        "label": "State Tax Revenue",
        "sector": "investment",
        "dmk_cagr_pct": 13.4,
        "dmk_period": "FY22-FY26",
        "unit": "%",
        "nominal": True,
        "source": "TN Finance Dept Revenue Receipts series",
        "source_url": "https://tnbudget.tn.gov.in/",
        "notes": "Reflects buoyant GSDP + improved compliance.",
    },
]

DMK_CAGR_LOOKUP = {b["key"]: b for b in DMK_CAGR_BASELINES}

SECTOR_ORDER = ["headline", "agriculture", "industry", "services", "investment"]


# ---------- TVK QUARTERLY TRACKER ----------------------------------------
#
# The tracker stores each released quarterly observation under TVK so we
# can annualise + compare against the DMK CAGR. Storage shape:
#
#   table economic_quarterly_data (
#     id            uuid primary key,
#     metric_key    text not null references DMK_CAGR_BASELINES.key (in code),
#     fy            int  not null,      -- e.g. 2027 for FY27
#     quarter       int  not null,      -- 1..4 (Q1=Apr-Jun)
#     value         numeric not null,   -- observed level, OR an observed period CAGR
#     value_type    text not null,      -- 'cagr_pct' | 'level' | 'yoy_pct'
#     source        text not null,
#     source_url    text,
#     notes         text,
#     ingested_at   timestamptz default now()
#   );
#
# For the MVP we accept any of these value types and the dashboard picks
# the right comparison:
#   - 'cagr_pct'  : observed CAGR over TVK tenure → compare directly to dmk_cagr_pct
#   - 'yoy_pct'   : year-over-year quarterly growth → annualise and compare
#   - 'level'     : absolute value (used when caller wants to compute CAGR vs
#                   a known DMK end-of-tenure level — future enhancement)


class QuarterlyUpsert(BaseModel):
    metric_key: str
    fy: int
    quarter: int
    value: float
    value_type: str = "yoy_pct"  # default to the most-commonly published form
    source: str
    source_url: Optional[str] = None
    notes: Optional[str] = None


def _verify_admin(secret: Optional[str]):
    if secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="admin secret required")


def _annualise(observation: dict) -> float | None:
    """Convert any TVK observation into a comparable annualised %.

    - cagr_pct: already annualised → return as-is
    - yoy_pct:  already annual rate → return as-is (single-quarter YoY proxy)
    - level:    cannot annualise without a baseline level → None (future work)
    """
    vt = observation.get("value_type")
    if vt in ("cagr_pct", "yoy_pct"):
        return float(observation.get("value") or 0.0)
    return None


# ---------- ROUTES --------------------------------------------------------

@router.get("/baselines")
async def list_economic_baselines(sector: Optional[str] = None):
    """Return the static DMK CAGR baseline list, optionally filtered by sector."""
    if sector:
        return [b for b in DMK_CAGR_BASELINES if b["sector"] == sector]
    return DMK_CAGR_BASELINES


@router.get("/dashboard")
async def economic_dashboard():
    """For each DMK CAGR baseline, attach the latest TVK observation if we
    have one, compute the delta_pp (percentage-points difference), and
    group by sector for clean rendering.

    Output shape per row:
      {
        key, label, sector,
        dmk_cagr_pct, dmk_period, dmk_source, dmk_source_url,
        tvk_observed_pct,           -- annualised observed rate
        tvk_value_type,             -- 'cagr_pct' | 'yoy_pct' | None
        tvk_period_label,           -- e.g. "FY27 Q2 YoY"
        tvk_source, tvk_source_url,
        delta_pp,                   -- (tvk_observed - dmk_cagr) in pp
        verdict,                    -- "ahead" | "behind" | "tracking" | "no_data"
      }
    """
    db = get_db()
    try:
        res = (
            db.table("economic_quarterly_data")
            .select("metric_key, fy, quarter, value, value_type, source, source_url, notes, ingested_at")
            .order("fy", desc=True)
            .order("quarter", desc=True)
            .order("ingested_at", desc=True)
            .execute()
        )
        observations = res.data or []
    except Exception:
        # Table may not yet exist (pre-migration) — fall through with empty data
        observations = []

    # Pick the most-recent observation per metric_key (already sorted desc)
    latest_by_key: dict[str, dict] = {}
    for obs in observations:
        k = obs.get("metric_key")
        if k and k not in latest_by_key:
            latest_by_key[k] = obs

    out = []
    for b in DMK_CAGR_BASELINES:
        obs = latest_by_key.get(b["key"])
        tvk_pct = _annualise(obs) if obs else None
        delta_pp = None
        verdict = "no_data"
        if tvk_pct is not None:
            delta_pp = round(tvk_pct - float(b["dmk_cagr_pct"]), 2)
            if delta_pp > 0.5:
                verdict = "ahead"
            elif delta_pp < -0.5:
                verdict = "behind"
            else:
                verdict = "tracking"

        period_label = None
        if obs:
            period_label = f"FY{obs['fy']} Q{obs['quarter']} {obs['value_type']}"

        out.append({
            "key": b["key"],
            "label": b["label"],
            "sector": b["sector"],
            "dmk_cagr_pct": b["dmk_cagr_pct"],
            "dmk_period": b["dmk_period"],
            "dmk_source": b["source"],
            "dmk_source_url": b.get("source_url"),
            "nominal": b.get("nominal", False),
            "tvk_observed_pct": tvk_pct,
            "tvk_value_type": obs.get("value_type") if obs else None,
            "tvk_period_label": period_label,
            "tvk_source": obs.get("source") if obs else None,
            "tvk_source_url": obs.get("source_url") if obs else None,
            "tvk_notes": obs.get("notes") if obs else None,
            "tvk_ingested_at": obs.get("ingested_at") if obs else None,
            "delta_pp": delta_pp,
            "verdict": verdict,
        })

    # Sort by sector then label so the dashboard groups cleanly
    sector_idx = {s: i for i, s in enumerate(SECTOR_ORDER)}
    out.sort(key=lambda r: (sector_idx.get(r["sector"], 99), r["label"]))

    summary = {
        "total_metrics":   len(out),
        "with_tvk_data":   sum(1 for r in out if r["tvk_observed_pct"] is not None),
        "tvk_ahead":       sum(1 for r in out if r["verdict"] == "ahead"),
        "tvk_behind":      sum(1 for r in out if r["verdict"] == "behind"),
        "tvk_tracking":    sum(1 for r in out if r["verdict"] == "tracking"),
        "as_of":           date.today().isoformat(),
    }

    return {"summary": summary, "rows": out}


@router.post("/quarterly")
async def upsert_quarterly_observation(
    payload: QuarterlyUpsert,
    x_admin_secret: Optional[str] = Header(None),
):
    """Admin-only: record a new TVK quarterly observation.

    Typically called by the user after a new RBI State Finances / TN Economic
    Survey release becomes available. The dashboard picks the latest by
    (fy desc, quarter desc, ingested_at desc) per metric_key.
    """
    _verify_admin(x_admin_secret)
    if payload.metric_key not in DMK_CAGR_LOOKUP:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown metric_key '{payload.metric_key}'. Valid: {list(DMK_CAGR_LOOKUP)}",
        )
    if payload.quarter not in (1, 2, 3, 4):
        raise HTTPException(status_code=400, detail="quarter must be 1..4")
    if payload.value_type not in ("cagr_pct", "yoy_pct", "level"):
        raise HTTPException(
            status_code=400,
            detail="value_type must be cagr_pct | yoy_pct | level",
        )

    db = get_db()
    record = {
        "metric_key": payload.metric_key,
        "fy": payload.fy,
        "quarter": payload.quarter,
        "value": payload.value,
        "value_type": payload.value_type,
        "source": payload.source,
        "source_url": payload.source_url,
        "notes": payload.notes,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        res = db.table("economic_quarterly_data").insert(record).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Insert failed (table 'economic_quarterly_data' may not exist yet). "
                f"Run the migration. Underlying: {e}"
            ),
        )
    return {"ok": True, "inserted": res.data}


@router.get("/quarterly")
async def list_quarterly_observations(metric_key: Optional[str] = None, limit: int = 100):
    """Read-only: list raw observations, newest first. For audit/debug."""
    db = get_db()
    try:
        q = db.table("economic_quarterly_data").select("*")
        if metric_key:
            q = q.eq("metric_key", metric_key)
        res = (
            q.order("fy", desc=True)
             .order("quarter", desc=True)
             .order("ingested_at", desc=True)
             .limit(limit)
             .execute()
        )
        return res.data or []
    except Exception:
        return []
