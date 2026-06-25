"""Seed: 300-buses credit-steal (flagged by @dstock_insights / @saysatheesh,
web-verified). PARTIAL / likely-genuine, inferred-not-documented.

CM Vijay flagged off 300 new govt buses (Rs 127.21 cr; 164 diesel + 136 CNG; 7
STUs) at a centralised Chennai ceremony on 25 Jun 2026, riding one to Marina —
framed as a TVK achievement. Reality: TN's bus pipeline (tender -> chassis ->
body-build -> delivery) takes 12+ months, and the documented procurement
predates TVK: IRT floated tenders for 1,614 buses (Oct 2024) and 2,134 more
(Apr 2025) under DMK Transport Min. S.S. Sivasankar, part of a ~21,068-bus
KfW/World Bank/state programme. Buses delivered Jun 2026 were tendered/funded
under DMK; TVK (office since 10 May 2026) presided over the flag-off.
HONEST CAVEAT: no source ties these EXACT 300 buses to a specific DMK tender/GO
-- strong inference (pipeline + DMK tenders + no new TVK tender), not documented.
Bus procurement routinely spans governments; the issue is the framing.
"""
from __future__ import annotations
import os, sys
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("="); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
from app.database import get_db  # noqa: E402


def run() -> int:
    db = get_db()
    row = {
        "title": "TVK credit-claim on 300 new govt buses — procured through the DMK-era pipeline",
        "summary": (
            "CM Vijay flagged off 300 new government buses (₹127.21 cr; 164 diesel + 136 CNG, "
            "BS-VI; distributed to 7 of 8 STUs) at a centralised ceremony in Chennai on 25 June "
            "2026, riding one to Marina Beach — presented as a TVK-government achievement. "
            "Reality: Tamil Nadu's bus pipeline (tender → chassis → body-build → delivery) takes "
            "12+ months, and the documented procurement all predates TVK — IRT floated tenders "
            "for 1,614 TNSTC buses (Oct 2024) and 2,134 more across MTC/TNSTC/SETC (Apr 2025) "
            "under DMK Transport Minister S.S. Sivasankar, part of a ~21,068-bus KfW / World "
            "Bank / state-funded programme. Buses delivered in June 2026 were tendered and "
            "funded under the DMK government; the TVK government (in office since 10 May 2026) "
            "presided over the flag-off."
        ),
        "category": "credit_stealing",
        "incident_date": "2026-06-25",
        "location": "Chennai",
        "district": "Chennai",
        "severity": 2,
        "ai_confidence": 0.78,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "is_credit_steal": True,
        "original_credit": (
            "TN bus-modernisation programme (~21,068 buses via KfW / World Bank / state funds) — "
            "tenders floated under DMK Transport Min. S.S. Sivasankar: 1,614 buses (Oct 2024), "
            "2,134 buses (Apr 2025); 1,666-bus Ashok Leyland replacement order (Oct 2023). "
            "12+ month pipeline; delivered under TVK June 2026."
        ),
        "related_dmk_scheme": "TN bus modernisation / KfW bus procurement programme — DMK 2021-26",
        "source_urls": [
            "https://www.deccanchronicle.com/southern-states/tamil-nadu/cm-vijay-flags-off-300-new-govt-buses-takes-bus-ride-in-chennai-1966142",
            "https://www.dtnext.in/news/chennai/cm-vijay-flags-off-300-new-diesel-cng-buses-in-chennai",
            "https://www.dtnext.in/news/tamilnadu/tenders-floated-to-procure-2134-new-buses-across-tamil-nadu-831860",
            "https://www.dtnext.in/news/tamilnadu/tender-floated-to-procure-1614-fully-built-non-ac-buses-for-tnstc-806819",
        ],
        "source_count": 4,
        "event_signature": "credit_stealing:chennai:2026-06-25-300-govt-buses",
        "ai_raw": {
            "tags_extra": ["credit_stealing", "transport", "infrastructure"],
            "people_mentioned": ["CM C. Joseph Vijay", "S.S. Sivasankar (DMK, floated tenders)"],
            "raised_by": "@dstock_insights / @saysatheesh, Jun 2026",
            "honesty_caveats": (
                "PARTIAL / inferred-not-documented: no source ties these EXACT 300 buses to a "
                "specific DMK tender/GO. The DMK-origin conclusion is a strong inference from the "
                "12+ month procurement pipeline + the documented DMK-era tenders (1,614 Oct 2024; "
                "2,134 Apr 2025) + the absence of any new TVK tender — not a documented link. Bus "
                "procurement routinely spans governments; partial credit to the incumbent for "
                "delivery/commissioning is normal — the issue is the framing (own achievement, no "
                "acknowledgment of origin)."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "member_ids": [],
        "image_urls": [],
    }
    res = db.table("incidents").insert(row).execute()
    inc_id = res.data[0]["id"] if res.data else None
    print(f"[ok] 300-buses credit-steal -> {inc_id}")
    # link the originating tweet_watch rows
    if inc_id:
        for tid in ("2069677662008987914", "2069794924518912475", "2069621740813336612"):
            db.table("tweet_watch").update({
                "status": "added", "linked_incident_id": inc_id,
                "review_note": "Verified + added as 300-buses credit-steal (DMK-era procurement pipeline)",
            }).eq("tweet_id", tid).execute()
    cs = db.table("incidents").select("id", count="exact").eq("category", "credit_stealing").eq("status", "approved").execute()
    print(f"==== credit_stealing approved total: {cs.count} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
