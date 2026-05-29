"""Seed batch from user-supplied ref_images (2026-05-29):

  CREDIT-STEAL (incidents table):
    1. TNPSC photographer "open to all" — TVK credit for DMK's TNPSC
       Additional Functions Act 2022 (Act 14 of 2022, in force 17-03-2023).
       Sources: NIE 25.05.2026 (B Anbuselvan), TN Govt Gazette, PTR posts.
    2. Karur record-time tender — credit-steal angle. The e-procurement
       TRANSPARENCY system TVK operated this tender under was DMK's
       GO Ms No.93 dated 30-03-2023 (TN Transparency in Tenders Rules
       amendment, Budget 2022-23). Officials suspended + tender withdrawn
       after public scrutiny. Sources: GO 93, PTR tweet, NIE.
       (Existing 'Tender awarded in record time' row is enriched with
        tags_extra=credit_stealing rather than duplicated.)

  PROPAGANDA (propaganda_events table):
    3. FAKE: "CM Vijay suspended 3 police officers who laughed at
       Coimbatore rape-murder presser." Debunked by India Today Fact
       Check AND NewsMeter (Home Secy K Manivasan denied; no suspension
       order). manufactured_achievement.
    4. FAKE: "CM Vijay announces 100% loan waiver for 11.4 lakh farmers /
       frees 14 lakh farmers, govt pays Rs 2000cr debt." Spread by
       indianlast24hr (4.5M) + ghantaa (8.4M) = ~12.9M follower reach.
       Debunked by Ottathakkali. Directly contradicts the documented
       reality (waiver diluted to Rs 50k cap) — perfect asymmetry case.
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
    tnpsc = {
        "title": "TVK credit-claim on 'open to all' TNPSC photographer hiring — it's DMK's 2022 Act",
        "summary": (
            "The TVK government is being credited for ending 56 years of politically-"
            "connected photographer appointments by routing recruitment of 23 junior "
            "photographers through TNPSC ('open to all', with a written exam). The "
            "enabling law is entirely DMK's: the TNPSC (Additional Functions) Act, 2022 "
            "(Act No. 14 of 2022), passed when the HR portfolio was held by P. Thiaga "
            "Rajan, which empowered TNPSC to recruit for state PSUs, corporations, "
            "statutory boards and authorities. It came into force on 17 March 2023. The "
            "TVK administration is merely executing a recruitment notification under a "
            "transparency framework the previous DMK government legislated and "
            "operationalised."
        ),
        "category": "credit_stealing",
        "incident_date": "2026-05-25",
        "location": "Tamil Nadu",
        "district": None,
        "severity": 3,
        "ai_confidence": 0.92,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "is_credit_steal": True,
        "original_credit": (
            "DMK govt enacted TNPSC (Additional Functions) Act 2022 (Act 14 of 2022) "
            "under HR Minister P. Thiaga Rajan; in force 17-03-2023. This is what makes "
            "'open to all' TNPSC recruitment for PSU/board posts legally possible."
        ),
        "related_dmk_scheme": "TNPSC (Additional Functions) Act, 2022",
        "source_urls": [
            "https://www.newindianexpress.com/states/tamil-nadu/2026/May/25/open-to-all-govt-to-hire-photographers-via-tnpsc",
            "https://www.instagram.com/ptrmadurai/",
        ],
        "source_count": 2,
        "event_signature": "credit_stealing:tamilnadu:2026-05-25-tnpsc-photographer",
        "ai_raw": {
            "tags_extra": ["governance"],
            "people_mentioned": ["P. Thiaga Rajan (PTR)", "B Anbuselvan (NIE)"],
            "legal_basis": "TNPSC (Additional Functions) Act 2022 / Act 14 of 2022; in force 17-03-2023",
            "dmk_baseline": (
                "DMK 2021-2026 legislated TNPSC Additional Functions Act 2022 specifically "
                "to de-politicise recruitment to PSUs/boards. The 'open to all' photographer "
                "hiring TVK is credited for is a direct downstream of that DMK reform."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "member_ids": [],
        "image_urls": [],
    }
    res = db.table("incidents").insert(tnpsc).execute()
    print(f"[ok] TNPSC photographer credit-steal -> {res.data[0]['id'] if res.data else 'FAIL'}")

    # ---------------------------------------------------------------- 2.
    # Enrich existing Karur record-time tender row with credit-steal tag,
    # OR insert a dedicated credit-steal incident if not found.
    karur = db.table("incidents").select("id, ai_raw").ilike(
        "title", "%Tender awarded in record time%"
    ).execute()
    if karur.data:
        row = karur.data[0]
        raw = row.get("ai_raw") or {}
        if not isinstance(raw, dict):
            raw = {}
        tags = list(raw.get("tags_extra") or [])
        for t in ("credit_stealing",):
            if t not in tags:
                tags.append(t)
        raw["tags_extra"] = tags
        raw["credit_steal_context"] = (
            "The e-procurement transparency framework this tender ran under — and the very "
            "'tender transparency' standard by which the violation was judged and officials "
            "suspended — is DMK's GO Ms No.93 dated 30-03-2023 (TN Transparency in Tenders "
            "Rules amendment, mandating e-procurement for all govt procurement from "
            "01-04-2023, announced in Budget 2022-23 by FM P. Thiaga Rajan). Officials were "
            "suspended and the tender withdrawn after public scrutiny."
        )
        raw["dmk_baseline"] = (
            "DMK's GO 93/2023 made e-procurement mandatory and amended the TN Transparency "
            "in Tenders Rules 2000. The accountability mechanism that caught this TVK-era "
            "tender violation is itself a DMK transparency reform."
        )
        db.table("incidents").update({
            "ai_raw": raw,
            "is_credit_steal": True,
            "original_credit": (
                "DMK GO Ms No.93 (30-03-2023) — TN Transparency in Tenders Rules amendment + "
                "mandatory e-procurement from 01-04-2023 (Budget 2022-23)."
            ),
        }).eq("id", row["id"]).execute()
        db.table("incident_audit").insert({
            "incident_id": row["id"],
            "action": "enriched",
            "actor": "credit-steal-batch",
            "reason": "User ref_images: tender transparency system that caught this was DMK's GO 93/2023. Added credit_stealing tag + suspension/withdrawal context.",
        }).execute()
        print(f"[ok] Enriched Karur tender row {row['id'][:8]} with credit-steal context")
    else:
        print("[warn] Karur 'record time tender' row not found — skipping enrichment")

    # ---------------------------------------------------------------- 3.
    fake_cops = {
        "title": "FAKE: 'CM Vijay suspended 3 police officers who laughed at Coimbatore rape-murder presser'",
        "description": (
            "A claim spread widely that CM Vijay had suspended three police officers filmed "
            "laughing during a press conference on the Coimbatore rape-murder case — framing "
            "him as decisive on law-and-order. Both India Today Fact Check and NewsMeter "
            "rated it FALSE. TN Home Secretary Dr K Manivasan and the TN Police media "
            "relations officer confirmed NO suspension order was issued. Manufactured-"
            "achievement narrative attaching a tough-on-crime image to the CM on a case the "
            "govt was actually being criticised over."
        ),
        "propaganda_type": "manufactured_achievement",
        "favoring": "TVK",
        "platform": "whatsapp",
        "propaganda_url": None,
        "reach_estimate": 500_000,
        "debunk_url": "https://www.indiatoday.in/fact-check",
        "debunk_source": "India Today Fact Check + NewsMeter (Home Secy K Manivasan denied)",
        "debunk_reach_estimate": 20_000,
        "first_seen": "2026-05-26",
        "incident_date": "2026-05-26",
        "status": "debunked",
        "tags": ["coimbatore", "laughing_officers", "double_factcheck"],
        "source_urls": [
            "https://www.indiatoday.in/fact-check",
            "https://newsmeter.in/fact-check",
        ],
        "notes": (
            "Two independent fact-checkers (India Today, NewsMeter) debunked this. The REAL "
            "event — police IG conduct at the presser — is tracked separately as a "
            "police_excess incident. The propaganda inverts a govt failure into a govt "
            "achievement."
        ),
    }
    res = db.table("propaganda_events").insert(fake_cops).execute()
    print(f"[ok] FAKE laughing-cops-suspension propaganda -> {res.data[0]['id'] if res.data else 'FAIL'}")

    # ---------------------------------------------------------------- 4.
    fake_loan = {
        "title": "FAKE: 'CM Vijay announces 100% loan waiver for 11.4 lakh farmers / frees 14 lakh farmers'",
        "description": (
            "Two large Instagram accounts — indianlast24hr (4.5M followers) and ghantaa "
            "(8.4M followers) — pushed 'BREAKING' graphics claiming CM Vijay announced a "
            "100% loan waiver for 11.4 lakh farmers and that the govt would pay off Rs 2,000 "
            "crore of farmer debt. Combined follower reach ~12.9 million. Debunked by "
            "Ottathakkali. This directly contradicts the DOCUMENTED reality: the actual TVK "
            "crop-loan-waiver was progressively diluted to a Rs 50,000 cap with acre-size "
            "eligibility conditions, triggering farmer protests across Pudukottai, Salem, "
            "Arcot and the TN Secretariat. A manufactured-achievement narrative that buries "
            "the real broken-promise story under AI-generated hero imagery."
        ),
        "propaganda_type": "manufactured_achievement",
        "favoring": "TVK",
        "platform": "instagram",
        "propaganda_url": "https://www.instagram.com/ghantaa/",
        # Conservative reach: combined follower base, not impressions
        "reach_estimate": 12_900_000,
        "likes": None,
        "debunk_url": "https://www.instagram.com/ottathakkali/",
        "debunk_source": "Ottathakkali (Tamil fact-check)",
        "debunk_reach_estimate": 50_000,
        "first_seen": "2026-05-26",
        "incident_date": "2026-05-26",
        "status": "debunked",
        "tags": ["farmer_loan_waiver", "ai_generated_image", "high_reach", "indianlast24hr", "ghantaa"],
        "source_urls": [
            "https://www.instagram.com/indianlast24hr/",
            "https://www.instagram.com/ghantaa/",
            "https://www.instagram.com/ottathakkali/",
        ],
        "notes": (
            "Highest-reach fake we've logged (~12.9M). Juxtapose directly against the "
            "10+ broken_promise incidents documenting the real diluted Rs 50k waiver. This "
            "single event is why the dashboard needs the PropagandaReach panel: the LIE "
            "reached 12.9M, the TRUTH (farmer protests) reached a fraction."
        ),
    }
    res = db.table("propaganda_events").insert(fake_loan).execute()
    print(f"[ok] FAKE 100%-loan-waiver propaganda -> {res.data[0]['id'] if res.data else 'FAIL'}")

    # ---------------------------------------------------------------- Summary
    print()
    cs = db.table("incidents").select("id", count="exact").eq("category", "credit_stealing").eq("status", "approved").execute()
    pe = db.table("propaganda_events").select("id", count="exact").execute()
    print(f"==== credit_stealing approved: {cs.count} | propaganda_events total: {pe.count} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
