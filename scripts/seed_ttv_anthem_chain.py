"""One-shot: seed the Tamil Thaai Vaazhthu anthem-placement chain (3 events).

Captures the TVK govt's TTV climbdown sequence:
  - May 11: TTV demoted to 3rd at Vijay swearing-in (first such break in TN convention)
  - May 21: Repeated at Raj Bhavan cabinet expansion
  - May 27: CM Vijay requests Modi for a directive (instead of asserting state convention)

Also resurfaces the existing rejected row (121055a1-...) that was wrongly
filtered as governance during initial ingestion.
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
    EXISTING_ID = "121055a1-8364-4173-a2b7-acfdcd60e02d"

    # ---- Event 2: May 21 cabinet expansion (resurface existing rejected row) ----
    cabinet = {
        "title": "Tamil Thaai Vaazhthu placed 3rd AGAIN at Raj Bhavan cabinet expansion",
        "summary": (
            "At the May 21 TVK cabinet expansion ceremony at Raj Bhavan, Tamil Thaai Vaazhthu was again "
            "relegated to 3rd position, after Vande Mataram and Jana Gana Mana, repeating the pattern "
            "from the May 11 oath ceremony. CPI(M) and DMK called it a violation of long-standing TN "
            "convention where official functions begin with TTV. TVK minister Aadhav Arjuna cited a "
            "Union government circular for events featuring central representatives (Governor) and "
            "promised the convention would resume at state-run events: a partial deflection that "
            "accepts Centre prerogative inside Raj Bhavan."
        ),
        "category": "language_imposition",
        "incident_date": "2026-05-21",
        "location": "Raj Bhavan, Chennai",
        "district": "Chennai",
        "severity": 4,
        "ai_confidence": 0.92,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "source_urls": [
            "https://thefederal.com/category/states/south/tamil-nadu/anthem-row-erupts-again-as-tamil-thaai-vaazhthu-placed-3rd-at-ministers-swearing-in-243972",
            "https://www.reddit.com/r/TVKFiles/comments/1t8ydpp/tamil_thaai_vaazhthu_pushed_to_3rd_in_the_oath/",
        ],
        "source_count": 2,
        "event_signature": "language_imposition:rajbhavanchennai:2026-05-21",
        "ai_raw": {
            "tags_extra": ["federalism", "dravidian_attack"],
            "context": (
                "TN convention since 2021 (DMK GO) places TTV first at every state function. "
                "TVK accepting Raj Bhavan order without protest = soft acceptance of Centre overruling "
                "state cultural protocol."
            ),
            "people_mentioned": [
                "Aadhav Arjuna",
                "P Shanmugam (CPI-M)",
                "Rajendra Vishwanath Arlekar (Governor)",
            ],
        },
        "press_sentiment": "negative_for_govt",
        "is_credit_steal": False,
    }
    db.table("incidents").update(cabinet).eq("id", EXISTING_ID).execute()
    db.table("incident_audit").insert({
        "incident_id": EXISTING_ID,
        "action": "restored",
        "actor": "ttv-anthem-fix",
        "from_value": "rejected/governance",
        "to_value": "approved/language_imposition",
        "reason": (
            "User-flagged: TTV anthem placement is a TN state-sovereignty incident, not generic "
            "governance. Resurface with language_imposition and cross-tag federalism + "
            "dravidian_attack."
        ),
    }).execute()
    print(f"[ok] Resurfaced existing row {EXISTING_ID[:8]} -> language_imposition, approved")

    # ---- Event 1: May 11 oath ceremony (NEW) ----
    oath = {
        "title": "TTV demoted to 3rd at Vijay swearing-in — first such break in TN convention",
        "summary": (
            "At CM Vijay swearing-in on May 11, 2026 at Raj Bhavan, Tamil Thaai Vaazhthu was placed "
            "third in the order: Vande Mataram first, Jana Gana Mana second, TTV third. This broke a "
            "decades-long Tamil Nadu convention, codified by a 2021 DMK government order, that all "
            "state functions open with TTV. CPI state secretary M Veerapandiyan called it a violation "
            "of established protocol. The Governor office cited a Union government circular requiring "
            "Vande Mataram first at events featuring the Governor, President, or Vice President, "
            "effectively asserting Centre prerogative over TN cultural protocol on day one of the "
            "new govt. The TVK administration did not contest the order."
        ),
        "category": "language_imposition",
        "incident_date": "2026-05-11",
        "location": "Raj Bhavan, Chennai",
        "district": "Chennai",
        "severity": 5,
        "ai_confidence": 0.95,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "source_urls": [
            "https://www.tribuneindia.com/news/india/tamil-thaai-vaazhthu-being-relegated-to-third-place-at-vijay-swearing-in-sparks-political-row/",
            "https://www.theweek.in/news/india/2026/05/10/why-vande-mataram-before-tamil-thaai-vaazhthu-cpi-grills-cm-vijays-tvk-after-oath-ceremony.html",
            "https://www.india.com/news/india/vijay-national-song-national-anthem-tamil-thaai-vaazhthu-national-honour-jana-gana-mana-cpi-congress-dmk-aiadmk-8410522/",
        ],
        "source_count": 3,
        "event_signature": "language_imposition:rajbhavanchennai:2026-05-11",
        "ai_raw": {
            "tags_extra": ["federalism", "dravidian_attack"],
            "context": (
                "First public test of TVK posture on state-vs-Centre cultural protocol. Under DMK "
                "(2021-2026), the 2021 GO mandated TTV first at every official function. Even when "
                "Governor was present, state convention was enforced. TVK accepting Centre circular "
                "without contest sets a precedent that Centre directives override state convention "
                "at events held INSIDE TN."
            ),
            "people_mentioned": [
                "C Joseph Vijay",
                "M Veerapandiyan (CPI)",
                "Rajendra Vishwanath Arlekar (Governor)",
            ],
            "dmk_baseline": (
                "Under DMK 2021-2026, every state function opened with TTV per state GO; Governor "
                "presence did not change the order."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "is_credit_steal": False,
        "member_ids": [],
        "image_urls": [],
    }
    res1 = db.table("incidents").insert(oath).execute()
    oath_id = res1.data[0]["id"] if res1.data else None
    print(f"[ok] Created May 11 oath ceremony incident -> {oath_id}")

    # ---- Event 3: May 27 Delhi visit — Vijay requests Modi (NEW) ----
    delhi = {
        "title": "CM Vijay asks Modi for directive on Tamil Thaai Vaazhthu — instead of asserting state convention",
        "summary": (
            "On his maiden Delhi visit as CM (May 27, 2026), Vijay formally requested PM Modi to issue "
            "a directive allowing Tamil Thaai Vaazhthu to be sung at the start of government events. "
            "By asking the Centre for permission, TVK accepts that the placement of TN state anthem "
            "is a Union prerogative: a structural climbdown from the DMK posture (2021-2026) which "
            "enforced TTV-first via state GO regardless of Centre stance. The same meeting raised "
            "Mekedatu dam concerns and the release of TN fishermen detained by Sri Lanka. The TTV "
            "request frames a state-sovereignty matter as a favour to be granted by Delhi."
        ),
        "category": "federalism",
        "incident_date": "2026-05-27",
        "location": "New Delhi",
        "district": None,
        "severity": 4,
        "ai_confidence": 0.93,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "source_urls": [
            "https://www.theweek.in/news/india/2026/05/27/from-mekedatu-to-metro-rail-cm-vijay-raises-key-tamil-nadu-issues-during-his-first-trip-to-delhi.html",
            "https://www.india.com/news/india/tamil-nadu-cm-vijay-meets-pm-narendra-modi-delhi-first-official-visit-mekedatu-project-fishermen-issues-amit-shah-nirmala-sitharam-tvk-bjp-8428242/",
            "https://www.business-standard.com/india-news/tn-cm-vijay-raises-mekedatu-fishermen-arrests-in-meeting-with-pm-modi-126052701413_1.html",
        ],
        "source_count": 3,
        "event_signature": "federalism:newdelhi:2026-05-27",
        "ai_raw": {
            "tags_extra": ["language_imposition", "dravidian_attack"],
            "context": (
                "DMK governance precedent: state convention enforced via GO; never sought Centre "
                "approval for state-anthem placement. TVK request frames TTV placement as Union "
                "discretion. This is the structural softness: asking permission instead of asserting "
                "right."
            ),
            "people_mentioned": ["C Joseph Vijay", "Narendra Modi"],
            "dmk_baseline": (
                "DMK 2021-2026: TTV-first enforced via state GO; no Delhi appeal sought. Multiple "
                "instances of state-Centre conflict (NEET, GST share, Governor Ravi bills) were "
                "contested in court/assembly, not negotiated as favours."
            ),
            "promise_verdict": None,
        },
        "press_sentiment": "negative_for_govt",
        "is_credit_steal": False,
        "member_ids": [],
        "image_urls": [],
    }
    res2 = db.table("incidents").insert(delhi).execute()
    delhi_id = res2.data[0]["id"] if res2.data else None
    print(f"[ok] Created May 27 Delhi visit incident -> {delhi_id}")

    print()
    print("==== Summary ====")
    print(f"  Event 1 (May 11 oath):        {oath_id}")
    print(f"  Event 2 (May 21 cabinet):     {EXISTING_ID} (resurfaced)")
    print(f"  Event 3 (May 27 Delhi visit): {delhi_id}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
