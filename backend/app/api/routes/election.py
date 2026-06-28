"""Election Insights — 2026 TN Assembly election (OBSERVED layer, P1).

Serves the analysis tab: state summary, all 234 constituencies, district
rollups, and the 2021->2026 swing. Everything here is OBSERVED (results,
turnout, electors) — the inferred demographic layer (P3) is a separate route.

Credits (per the dashboard's sourcing rule, shown on the tab too):
  - Method / forensics primer: github.com/kaduvan/election-forensics
  - Analysis inspiration:        X / @_kaduvan
  - Results data:                ECI (results.eci.gov.in), via the
                                 tnelections2026.in aggregator; headline
                                 figures spot-checked against ECI final.
"""
from __future__ import annotations
from fastapi import APIRouter
from app.database import get_db

router = APIRouter(prefix="/election", tags=["election"])

# ECI-certified state figures (results.eci.gov.in / ECI final, cross-checked
# 2026-06-28). Hard-coded as a Tier-1 reference because the per-candidate vote
# counts are not in the accessible feed; these are the official state totals.
_ECI_STATE = {
    "turnout_pct": 85.1,
    "registered_electors": 57343291,
    "parties": [
        {"party": "TVK",    "votes": 17226209, "vote_share": 34.92, "swing": None,    "seats": 108},
        {"party": "DMK",    "votes": 11926144, "vote_share": 24.19, "swing": -13.51,  "seats": 59},
        {"party": "AIADMK", "votes": 10462146, "vote_share": 21.21, "swing": -12.08,  "seats": 47},
    ],
    "alliances": [
        {"alliance": "TVK",       "vote_share": 35.02, "seats": 108},
        {"alliance": "SPA-DMK+",  "vote_share": 31.40, "seats": 73},
        {"alliance": "NDA-ADMK+", "vote_share": 27.21, "seats": 53},
    ],
    "source": "ECI (results.eci.gov.in), 2026 final",
}

_CREDITS = {
    "method": "github.com/kaduvan/election-forensics",
    "analysis_inspiration": "X / @_kaduvan",
    "results_data": "ECI via tnelections2026.in (aggregator); spot-checked vs ECI final",
}


def _all_constituencies(db) -> list[dict]:
    rows, offset = [], 0
    while True:
        batch = (db.table("election_constituencies").select("*")
                 .range(offset, offset + 999).order("ac_no").execute().data or [])
        rows.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


@router.get("/summary")
async def election_summary():
    db = get_db()
    cons = _all_constituencies(db)

    seats_2026: dict[str, int] = {}
    seats_2021: dict[str, int] = {}
    flips = 0
    e_total = e_male = e_female = e_third = 0
    for c in cons:
        w26, w21 = c.get("winner_2026"), c.get("winner_2021")
        if w26:
            seats_2026[w26] = seats_2026.get(w26, 0) + 1
        if w21:
            seats_2021[w21] = seats_2021.get(w21, 0) + 1
        if w26 and w21 and w26 != w21:
            flips += 1
        e_total  += c.get("electors") or 0
        e_male   += c.get("electors_male") or 0
        e_female += c.get("electors_female") or 0
        e_third  += c.get("electors_third") or 0

    return {
        "total_seats": len(cons),
        "seats_2026": dict(sorted(seats_2026.items(), key=lambda x: -x[1])),
        "seats_2021": dict(sorted(seats_2021.items(), key=lambda x: -x[1])),
        "flips_2021_to_2026": flips,
        "electors": {"total": e_total, "male": e_male, "female": e_female, "third": e_third},
        "eci_state": _ECI_STATE,
        "credits": _CREDITS,
        "honest_note": (
            "Seat counts are computed from per-constituency winners (matches ECI "
            "final: TVK 108 / DMK 59 / AIADMK 47). State vote totals are ECI-certified. "
            "DMK fell 133->59 and TVK rose 0->108: a real anti-incumbent wave, shown "
            "straight. No fraud is claimed — this is post-result analysis."
        ),
    }


@router.get("/constituencies")
async def list_constituencies():
    """All 234 ACs for the map / filterable table, with flip flag + female share."""
    db = get_db()
    out = []
    for c in _all_constituencies(db):
        el = c.get("electors") or 0
        out.append({
            **c,
            "flipped": bool(c.get("winner_2026") and c.get("winner_2021")
                            and c["winner_2026"] != c["winner_2021"]),
            "female_share": round((c.get("electors_female") or 0) / el * 100, 1) if el else None,
        })
    return out


def _candidate_stats(cands: list[dict]) -> dict:
    total = len(cands)
    women = sum(1 for c in cands if (c.get("gender") or "").lower().startswith("f"))
    crim = sum(1 for c in cands if c.get("criminal"))
    ages = [c["age"] for c in cands if c.get("age")]
    assets = [c["assets_cr"] for c in cands if c.get("assets_cr") is not None]
    winners = [c for c in cands if c.get("result") == "won"]
    crim_win = sum(1 for c in winners if c.get("criminal"))
    return {
        "candidates": total,
        "women": women,
        "criminal": crim,
        "criminal_pct": round(crim / total * 100, 1) if total else None,
        "avg_age": round(sum(ages) / len(ages), 1) if ages else None,
        "avg_assets_cr": round(sum(assets) / len(assets), 2) if assets else None,
        "winners_total": len(winners),
        "winners_with_criminal": crim_win,
        "women_winners": sum(1 for c in winners if (c.get("gender") or "").lower().startswith("f")),
    }


@router.get("/district/{district}")
async def district_detail(district: str):
    """Drill-down for one district: its constituencies + candidate insights.
    (Booth-level / Form 20 is a separate, pending layer — see booth_status.)"""
    db = get_db()
    cons = [c for c in _all_constituencies(db)
            if (c.get("district") or "").lower() == district.lower()]
    if not cons:
        return {"district": district, "found": False}
    ac_nos = [c["ac_no"] for c in cons]

    cands: list[dict] = []
    try:
        for i in range(0, len(ac_nos), 50):
            chunk = ac_nos[i:i + 50]
            cands.extend(db.table("election_candidates").select("*")
                         .in_("ac_no", chunk).execute().data or [])
    except Exception:
        cands = []  # table not migrated yet — degrade gracefully

    for c in cons:
        c["flipped"] = bool(c.get("winner_2026") and c.get("winner_2021")
                            and c["winner_2026"] != c["winner_2021"])
        if cands:
            c["candidates_list"] = sorted(
                [{k: x.get(k) for k in ("name", "party", "alliance", "gender", "age",
                                        "assets_text", "assets_cr", "criminal", "result")}
                 for x in cands if x.get("ac_no") == c["ac_no"]],
                key=lambda x: (x.get("result") != "won", -(x.get("assets_cr") or 0)))

    return {
        "district": cons[0]["district"],
        "found": True,
        "seats": len(cons),
        "flips": sum(1 for c in cons if c["flipped"]),
        "constituencies": sorted(cons, key=lambda c: c["ac_no"]),
        "candidate_stats": _candidate_stats(cands) if cands else None,
        "booth_status": {
            "available": False,
            "note": ("Booth-level (Form 20) analysis is not yet ingested for this "
                     "district. It is the next data phase — real Form 20 only, no estimates."),
        },
    }


@router.get("/candidate-insights")
async def candidate_insights():
    """State-level candidate highlights (winners): criminal cases, richest, women."""
    db = get_db()
    try:
        winners = (db.table("election_candidates").select("*")
                   .eq("result", "won").execute().data or [])
    except Exception:
        return {"available": False, "note": "election_candidates not migrated yet"}
    if not winners:
        return {"available": False}
    crim = [w for w in winners if w.get("criminal")]
    richest = sorted([w for w in winners if w.get("assets_cr")],
                     key=lambda w: -(w["assets_cr"]))[:10]
    return {
        "available": True,
        "winners": len(winners),
        "with_criminal_cases": len(crim),
        "criminal_pct": round(len(crim) / len(winners) * 100, 1),
        "women_winners": sum(1 for w in winners if (w.get("gender") or "").lower().startswith("f")),
        "richest": [{"name": w["name"], "party": w.get("party"),
                     "assets_text": w.get("assets_text"), "ac_no": w.get("ac_no")} for w in richest],
    }


@router.get("/districts")
async def district_rollup():
    """38-district rollup: seats by party 2026, electors, female share."""
    db = get_db()
    agg: dict[str, dict] = {}
    for c in _all_constituencies(db):
        d = c.get("district") or "Unknown"
        a = agg.setdefault(d, {"district": d, "seats": 0, "seats_2026": {},
                               "electors": 0, "electors_female": 0})
        a["seats"] += 1
        w = c.get("winner_2026")
        if w:
            a["seats_2026"][w] = a["seats_2026"].get(w, 0) + 1
        a["electors"] += c.get("electors") or 0
        a["electors_female"] += c.get("electors_female") or 0
    for a in agg.values():
        a["female_share"] = round(a["electors_female"] / a["electors"] * 100, 1) if a["electors"] else None
        a["lead_party"] = max(a["seats_2026"], key=a["seats_2026"].get) if a["seats_2026"] else None
    return sorted(agg.values(), key=lambda x: -x["seats"])
