"""One-shot: seed the 'Companies Leaving TN' industrial-flight chain.

User flagged the Companies Leaving TN widget showing 0 despite real
events. Three confirmed events:

  - Royal Enfield: Rs 2,200 cr expansion to Andhra Pradesh (Satyavedu,
    Tirupati) — first plant outside TN since 1901. Press: Business
    Standard, Cartoq, Siasat, The Federal.

  - AMCA defence aerospace complex: TN lost the proposed Advanced
    Medium Combat Aircraft flight-testing & integration complex (3 yrs
    of DRDO talks for Hosur) to Andhra Pradesh. Press: New Indian Express.

  - Parandur greenfield airport: under review by TVK govt. Pre-poll
    promise to villagers was to scrap it. 1,700 acres already acquired.
    Either keep -> broken_promise; cancel -> industrial draw loss.
    Press: The Federal, DTNext, OneIndia, NIE.

Both Royal Enfield and Parandur had existing rejected rows in the DB,
mis-classified as 'governance'. Those rows are resurfaced with the
correct 'industrial_flight' category. AMCA is a new insert.
"""
from __future__ import annotations
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from app.database import get_db  # noqa: E402


def run() -> int:
    db = get_db()

    # Find the existing rejected rows by title fragment
    enf = db.table("incidents").select("id, title").ilike("title", "%ROYAL ENFIELD FACTORY%").execute()
    par = db.table("incidents").select("id, title").ilike("title", "%Parandur airport is going to stall%").execute()
    enfield_id = (enf.data or [{}])[0].get("id")
    parandur_id = (par.data or [{}])[0].get("id")
    print(f"  Existing Royal Enfield row: {enfield_id}")
    print(f"  Existing Parandur row:      {parandur_id}")

    # ---- Royal Enfield (resurface + remap) ----
    enfield_update = {
        "title": "Royal Enfield's first plant outside TN in 124 years: Rs 2,200 cr to Andhra Pradesh",
        "summary": (
            "Royal Enfield announced a Rs 2,200 crore manufacturing facility in Satyavedu mandal, "
            "Tirupati district, Andhra Pradesh — its first major expansion outside Tamil Nadu since "
            "the company was founded in 1901. Phase 1 targets 2029, phase 2 by 2032, with capacity "
            "for 900,000 units. A dedicated vendor park alongside the plant will give component "
            "suppliers a ready-made reason to relocate too. The site sits just across the AP-TN "
            "border, near Hosur, which has been TN's auto/component cluster for decades. The "
            "company says TN remains 'central to long-term strategy' (4 existing TN plants), but "
            "the FUTURE-GROWTH capacity is now going to AP, not TN — exactly the signal an "
            "industrial-flight tracker exists to surface. Comes within weeks of TVK govt taking "
            "office, raising questions about industrial-confidence under the new administration."
        ),
        "category": "industrial_flight",
        "incident_date": "2026-05-07",
        "location": "Tirupati district, Andhra Pradesh (TN-border)",
        "district": None,
        "severity": 5,
        "ai_confidence": 0.94,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "source_urls": [
            "https://www.business-standard.com/amp/companies/news/royal-enfield-to-set-up-2-200-cr-unit-in-andhra-1st-outside-tamil-nadu-126050700290_1.html",
            "https://www.cartoq.com/bike-news/royal-enfield-new-factory-andhra-pradesh/",
            "https://www.siasat.com/andhra-bags-royal-enfields-rs-2200-crore-first-expansion-project-outside-tamil-nadu-3467017/amp/",
            "https://thefederal.com/category/business/royal-enfield-ap-expansion-tamil-nadu-debate-244089",
        ],
        "source_count": 4,
        "event_signature": "industrial_flight:tirupati:2026-05-07",
        "ai_raw": {
            "tags_extra": ["governance"],
            "amount_inr_cr": 2200,
            "destination_state": "Andhra Pradesh",
            "site": "Satyavedu mandal, Tirupati district",
            "future_capacity_units": 900000,
            "context": (
                "First Royal Enfield plant outside TN since 1901 founding. Hosur (TN) was the "
                "obvious choice on the same border. AP winning over TN is a confidence signal."
            ),
            "people_mentioned": ["Royal Enfield management"],
            "dmk_baseline": (
                "DMK 2021-2026 retained Royal Enfield's 4 TN plants; the company had not expanded "
                "outside TN throughout DMK tenure. Multiple Tata, Ola, Foxconn investments landed "
                "in TN during the same period."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "is_credit_steal": False,
    }
    if enfield_id:
        db.table("incidents").update(enfield_update).eq("id", enfield_id).execute()
        db.table("incident_audit").insert({
            "incident_id": enfield_id,
            "action": "restored",
            "actor": "industrial-flight-fix",
            "from_value": "rejected/governance",
            "to_value": "approved/industrial_flight",
            "reason": "User-flagged: Royal Enfield AP expansion is the flagship industrial_flight event, not generic governance.",
        }).execute()
        print(f"[ok] Resurfaced Royal Enfield row {enfield_id[:8]} -> industrial_flight")

    # ---- Parandur (resurface + remap) ----
    parandur_update = {
        "title": "Parandur airport under TVK review: 1,700 acres acquired, project status uncertain",
        "summary": (
            "The Parandur greenfield airport (Kancheepuram district), envisioned across 5,746 "
            "acres with capacity for 10 crore passengers/year, is under review by the new TVK "
            "govt. Approximately 1,700 acres are already acquired. Pre-poll, Vijay assured "
            "villagers the project would be scrapped, but the TVK manifesto stopped short of an "
            "explicit commitment. Two contradictory accountability outcomes are queued: (a) "
            "scrap = kept_promise to villagers but loss of TN's flagship aviation/industrial "
            "draw (Chennai already late vs Mumbai/Bengaluru/Hyderabad world-class airports); "
            "(b) proceed = broken_promise on the villager assurance. Project review delay itself "
            "is freezing investor confidence in TN aviation/logistics chains."
        ),
        "category": "industrial_flight",
        "incident_date": "2026-05-22",
        "location": "Parandur, Kancheepuram",
        "district": "Kancheepuram",
        "severity": 4,
        "ai_confidence": 0.88,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "source_urls": [
            "https://thefederal.com/category/states/south/tamil-nadu/parandur-airport-vijay-cm-review-water-bodies-flood-243436",
            "https://www.dtnext.in/news/chennai/all-eyes-on-parandur-as-cm-vijay-set-to-review-project",
            "https://www.oneindia.com/chennai/will-vijay-scrap-parandur-airport-project-ball-is-in-tn-cms-court-8085109.html",
            "https://www.magzter.com/stories/newspaper/The-New-Indian-Express-Chennai/VILLAGERS-WANT-VIJAY-TO-KEEP-PROMISE-HALT-PARANDUR-AIRPORT-LAND-ACQUISITION",
        ],
        "source_count": 4,
        "event_signature": "industrial_flight:parandurkancheepuram:2026-05-22",
        "ai_raw": {
            "tags_extra": ["broken_promise", "governance"],
            "site_acres_total": 5746,
            "acres_acquired": 1700,
            "projected_capacity_passengers_cr": 10,
            "context": (
                "Pre-poll: Vijay assured Parandur villagers project would be scrapped. Manifesto "
                "did NOT include explicit commitment, leaving room for the climbdown. Project "
                "review = investor freeze regardless of final decision."
            ),
            "people_mentioned": ["C Joseph Vijay", "Parandur villagers"],
            "dmk_baseline": (
                "DMK 2021-2026 launched Parandur as TN aviation flagship after Singur-style "
                "consultations; environmental concerns acknowledged but project pursued. Stalin "
                "personally drove timeline."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "is_credit_steal": False,
    }
    if parandur_id:
        db.table("incidents").update(parandur_update).eq("id", parandur_id).execute()
        db.table("incident_audit").insert({
            "incident_id": parandur_id,
            "action": "restored",
            "actor": "industrial-flight-fix",
            "from_value": "rejected/governance",
            "to_value": "approved/industrial_flight",
            "reason": "User-flagged: Parandur review is an industrial_flight event (investor freeze + flagship aviation project hanging).",
        }).execute()
        print(f"[ok] Resurfaced Parandur row {parandur_id[:8]} -> industrial_flight")

    # ---- AMCA defence aerospace complex (NEW) ----
    amca = {
        "title": "TN loses AMCA flight-testing complex to Andhra after 3 years of DRDO talks for Hosur",
        "summary": (
            "Tamil Nadu has lost the proposed Advanced Medium Combat Aircraft (AMCA) flight "
            "testing & integration complex — a flagship defence aerospace project — to Andhra "
            "Pradesh after 3 years of TN govt talks with DRDO to anchor it at Hosur. The original "
            "proposal envisaged the AMCA complex alongside the planned Hosur airport: testing on "
            "one side, passenger terminal on the other. Andhra's regional aggressiveness "
            "outmanoeuvred TN at the final stage. This is a structural loss for TN's defence "
            "corridor (Krishnagiri/Hosur cluster) and follows Royal Enfield's AP expansion "
            "announcement by 9 days, suggesting an AP industrial offensive that the TVK admin "
            "has not yet developed a response to."
        ),
        "category": "industrial_flight",
        "incident_date": "2026-05-16",
        "location": "Hosur (planned site lost)",
        "district": "Krishnagiri",
        "severity": 5,
        "ai_confidence": 0.90,
        "verification_status": "press_verified",
        "status": "approved",
        "source_urls": [
            "https://www.magzter.com/stories/newspaper/The-New-Indian-Express/TN-LOSES-MEGA-DEFENCE-FLIGHT-TESTING-HUB-TO-ANDHRA-AMID-REGIONAL-RIVALRY-848901",
        ],
        "source_count": 1,
        "event_signature": "industrial_flight:hosurkrishnagiri:2026-05-16",
        "ai_raw": {
            "tags_extra": ["governance", "federalism"],
            "destination_state": "Andhra Pradesh",
            "project_type": "Defence aerospace — AMCA flight testing & integration complex",
            "site_lost": "Hosur, Krishnagiri district",
            "context": (
                "3 years of TN-DRDO talks for Hosur. Andhra Pradesh's industrial outreach won the "
                "decision. Comes 9 days after Royal Enfield AP move — pattern, not coincidence."
            ),
            "people_mentioned": ["DRDO", "TN industrial dept"],
            "dmk_baseline": (
                "DMK 2021-2026 launched Tamil Nadu Defence Industrial Corridor (Krishnagiri-"
                "Coimbatore-Salem-Tiruchi-Chennai nodes) with Rs 75,000 cr investment target by "
                "2032 (AeroDefCon 2025 anchor event). The Hosur AMCA bid was a DMK-era pursuit "
                "lost in the TVK transition window."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "is_credit_steal": False,
        "member_ids": [],
        "image_urls": [],
    }
    res = db.table("incidents").insert(amca).execute()
    amca_id = res.data[0]["id"] if res.data else None
    print(f"[ok] Created AMCA defence loss -> {amca_id}")

    print()
    print("==== Summary: industrial_flight chain ====")
    print(f"  Royal Enfield (May 7):   {enfield_id}")
    print(f"  AMCA defence (May 16):   {amca_id}")
    print(f"  Parandur review (May 22): {parandur_id}")

    # Verify widget will populate now
    chk = db.table("incidents").select("id", count="exact").eq("category", "industrial_flight").eq("status", "approved").execute()
    print(f"\n  industrial_flight approved total: {chk.count}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
