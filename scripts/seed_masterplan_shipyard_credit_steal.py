"""Seed batch (user ref_images, 2026-06-18) — two verified credit-steals:

  1. CHENNAI 3rd MASTER PLAN — News18 Tamil Nadu / TV9 / Oneindia credited
     CM Vijay (17 Jun 2026) for Chennai's Third Master Plan (2027-46). Reality:
     CMDA commenced the TMP in Dec 2020; ALL substantive preparation —
     public consultations (Dec 2022), the Jameel C40 Urban Planning Climate Lab
     (Mar 2024), sub-plan consultancy tenders (Dec 2024) and 15+ studies (2025) —
     was carried out under the DMK government. Vijay merely "directed officials
     to make it international-standard." Oneindia's own report admits it
     "kadantha aatchiyil thodangappatta" (started in the previous government).
     Sources: NIE (17 Jun & 28 Mar 2026), The Hindu (8 Dec 2024 & 9 Feb 2025),
     C40 (28 Mar 2024), Oneindia / TV9 Tamil (17 Jun 2026).

  2. HD HYUNDAI Rs 38,000 cr THOOTHUKUDI SHIPYARD — Financial Express (18 Jun)
     framed it as a "CM Vijay-led TN govt" win after HD KSOE met Vijay (17 Jun).
     Reality: the Thoothukudi shipbuilding cluster, the NSHIPTN special-purpose
     vehicle (VOCPA + SIPCOT, 50:50) and Rs 30,000 cr shipyard MoUs (Cochin
     Shipyard, Mazagon Dock) were set up under DMK (Sept 2025, Min. TRB Rajaa);
     the HD Hyundai MoU was signed under DMK (Dec 2025). Vijay received a
     follow-up delegation. Enrich the existing Hyundai/Thoothukudi row if present;
     else insert. Sources: Business Standard (20 Sep 2025), Financial Express
     (18 Jun 2026), TN Rising conclave coverage.
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

    # ---------------------------------------------------------------- 1.
    masterplan = {
        "title": "TVK/News18 credit-claim on Chennai's 3rd Master Plan — it's a DMK-era CMDA project",
        "summary": (
            "News18 Tamil Nadu, TV9 and Oneindia credited CM Vijay (17 Jun 2026) for "
            "Chennai's Third Master Plan (2027-2046), framing it as a new TVK initiative. "
            "Reality: the CMDA commenced the Third Master Plan in December 2020, and ALL "
            "the substantive preparation was carried out under the DMK government (2021-26) "
            "— public consultations (Dec 2022), the Jameel C40 Urban Planning Climate Lab "
            "partnership (Mar 2024), sub-plan consultancy tenders (Dec 2024) and 15+ studies "
            "through 2025. CM Vijay merely 'directed officials to prepare it to international "
            "standard.' Oneindia's own report concedes the project 'started in the previous "
            "government.' A years-long CMDA exercise re-credited to the new CM."
        ),
        "category": "credit_stealing",
        "incident_date": "2026-06-17",
        "location": "Chennai",
        "district": "Chennai",
        "severity": 3,
        "ai_confidence": 0.93,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "is_credit_steal": True,
        "original_credit": (
            "Chennai Third Master Plan (2027-2046) — CMDA project commenced Dec 2020; public "
            "consultations Dec 2022; Jameel C40 Urban Planning Climate Lab Mar 2024; sub-plan "
            "consultancy tenders Dec 2024; 15+ studies through 2025 — all under DMK govt 2021-26."
        ),
        "related_dmk_scheme": "Chennai Third Master Plan (2027-2046) / CMDA + Jameel C40 Climate Lab",
        "source_urls": [
            "https://www.newindianexpress.com/cities/chennai/2026/Mar/28/cmda-may-miss-its-deadline-for-notifying-third-master-plan",
            "https://www.thehindu.com/news/cities/chennai/cmda-invites-tenders-for-sub-plan-proposals-for-third-master-plan/article68959202.ece",
            "https://www.c40.org/news/chennai-climate-action-planning-jameel-c40-urban-planning-climate-labs/",
        ],
        "source_count": 3,
        "event_signature": "credit_stealing:chennai:2026-06-17-third-master-plan",
        "ai_raw": {
            "tags_extra": ["credit_stealing", "governance", "urban_planning"],
            "people_mentioned": ["CM C. Joseph Vijay", "CMDA"],
            "claimed_by": ["News18 Tamil Nadu", "TV9 Tamil", "Oneindia"],
            "dmk_baseline": (
                "The Third Master Plan is a CMDA exercise running since Dec 2020; its entire "
                "preparation phase (consultations, C40 climate lab, sub-plan tenders, 15+ "
                "studies) happened under DMK 2021-26. TVK inherited a near-complete plan and "
                "re-credited it to CM Vijay via a 'make it international-standard' directive."
            ),
            "self_admission": "Oneindia (17 Jun 2026): the plan 'started in the previous government'.",
        },
        "press_sentiment": "negative_for_govt",
        "member_ids": [],
        "image_urls": [],
    }
    res = db.table("incidents").insert(masterplan).execute()
    print(f"[ok] Chennai 3rd Master Plan credit-steal -> {res.data[0]['id'] if res.data else 'FAIL'}")

    # ---------------------------------------------------------------- 2.
    ship = db.table("incidents").select("id, ai_raw, title").or_(
        "title.ilike.%Hyundai%,title.ilike.%Thoothukudi shipyard%,title.ilike.%shipbuild%"
    ).eq("is_credit_steal", True).execute()
    enrich = (
        "RE-CREDIT (17-18 Jun 2026): after an HD KSOE delegation met CM Vijay (17 Jun), "
        "Financial Express and News18 framed the Rs 38,000 cr HD Hyundai Thoothukudi "
        "shipbuilding cluster as a 'CM Vijay-led TN govt' win. The cluster, the NSHIPTN "
        "special-purpose vehicle (VOCPA + SIPCOT 50:50) and Rs 30,000 cr of shipyard MoUs "
        "(Cochin Shipyard, Mazagon Dock) were set up under DMK in Sept 2025 (Min. TRB Rajaa); "
        "the HD Hyundai MoU was signed under DMK in Dec 2025. Vijay received a follow-up "
        "delegation on an existing DMK-era project."
    )
    if ship.data:
        row = ship.data[0]
        raw = row.get("ai_raw") or {}
        if not isinstance(raw, dict):
            raw = {}
        raw["jun2026_recredit"] = enrich
        db.table("incidents").update({"ai_raw": raw}).eq("id", row["id"]).execute()
        print(f"[ok] Enriched existing shipyard row {row['id'][:8]} ('{row.get('title','')[:40]}') with Jun-2026 re-credit")
    else:
        shipyard = {
            "title": "TVK/News18 credit-claim on Rs 38,000 cr HD Hyundai Thoothukudi shipyard — it's DMK's 2025 MoU",
            "summary": (
                "Financial Express and News18 framed the Rs 38,000 cr HD Hyundai (HD KSOE) "
                "Thoothukudi shipbuilding cluster (15,000 jobs) as a 'CM Vijay-led TN govt' win "
                "after an HD KSOE delegation met CM Vijay on 17 Jun 2026. Reality: the "
                "Thoothukudi shipbuilding push, the NSHIPTN special-purpose vehicle (VOCPA + "
                "SIPCOT, 50:50) and Rs 30,000 cr of shipyard MoUs (Cochin Shipyard, Mazagon "
                "Dock) were set up under the DMK government in Sept 2025 (Min. TRB Rajaa); the "
                "HD Hyundai MoU was signed under DMK in Dec 2025. CM Vijay received a follow-up "
                "delegation on an inherited DMK-era project."
            ),
            "category": "credit_stealing",
            "incident_date": "2026-06-17",
            "location": "Thoothukudi",
            "district": "Thoothukudi",
            "severity": 3,
            "ai_confidence": 0.9,
            "verification_status": "multi_source_verified",
            "status": "approved",
            "is_credit_steal": True,
            "original_credit": (
                "Thoothukudi shipbuilding cluster + NSHIPTN SPV (VOCPA+SIPCOT) + Rs 30,000 cr "
                "shipyard MoUs (Cochin Shipyard, Mazagon Dock) set up under DMK Sept 2025 "
                "(Min. TRB Rajaa); HD Hyundai (HD KSOE) Rs 38,000 cr MoU signed under DMK Dec 2025."
            ),
            "related_dmk_scheme": "Thoothukudi shipbuilding cluster / NSHIPTN SPV / HD Hyundai MoU (DMK 2025)",
            "source_urls": [
                "https://www.financialexpress.com/business/infrastructure-cm-vijay-led-tamil-nadu-government-lands-rs-38000-crore-hyundai-investment-for-massive-shipbuilding-cluster-in-thoothukudi-15000-jobs-incoming-4270308/",
                "https://www.business-standard.com/politics/tn-secures-investments-worth-30-000-cr-in-shipbuilding-sector-trb-rajaa-125092000507_1.html",
            ],
            "source_count": 2,
            "event_signature": "credit_stealing:thoothukudi:2026-06-17-hyundai-shipyard",
            "ai_raw": {
                "tags_extra": ["credit_stealing", "investments"],
                "people_mentioned": ["CM C. Joseph Vijay", "TRB Rajaa (DMK, signed orig MoUs)", "HD KSOE"],
                "claimed_by": ["Financial Express", "News18 Tamil Nadu"],
                "jun2026_recredit": enrich,
            },
            "press_sentiment": "negative_for_govt",
            "member_ids": [],
            "image_urls": [],
        }
        res = db.table("incidents").insert(shipyard).execute()
        print(f"[ok] HD Hyundai shipyard credit-steal -> {res.data[0]['id'] if res.data else 'FAIL'}")

    # ---------------------------------------------------------------- Summary
    print()
    cs = db.table("incidents").select("id", count="exact").eq("category", "credit_stealing").eq("status", "approved").execute()
    print(f"==== credit_stealing approved total: {cs.count} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
