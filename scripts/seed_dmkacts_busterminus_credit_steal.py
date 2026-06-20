"""Seed batch (user ref_images, 2026-06-18) — 2 VERIFIED credit-steals.

Two other claims from the same 5-screenshot batch were REJECTED after web
verification (intellectual-honesty discipline):
  * Vellore "Rs 9,000 cr industrial park" = Tata-JLR Ranipet plant, INAUGURATED
    by DMK CM Stalin himself on 9 Feb 2026, before TVK took office. No TVK
    credit-claim exists; jobs figure inflated. NOT a credit-steal -> not added.
  * EC revocation (Brigade Morgan Heights / Pallikaranai Ramsar, 08.05.2026):
    real DMK-era action but NO TVK credit-claim exists; credit belongs to NGO
    Arappor Iyakkam. NOT a credit-steal -> not added.

ADDED:
  1. 5 DMK Acts gazette-notified ~5 Jun 2026 (incl. Schools Fee Regulation
     Amendment Act 2026 + Agricultural Produce Marketing Regulation Amendment
     Act 2026). Passed by the DMK-controlled 16th Assembly in its final session
     (Jan 2026), before the Apr-2026 election; June gazette notification is the
     routine final step. Pro-TVK media framed the school-fee crackdown as
     "CM Vijay's key decision."
  2. Chennai DMK-built bus termini re-credited to TVK. Honest reframe: drops the
     viral "Rs 2,000 cr" figure (matches no single terminus; real costs are
     Rs 394-414 cr each). Kilambakkam KCBT (Rs 393.74 cr) inaugurated by DMK CM
     Stalin Dec 2023; Kuthambakkam Arignar Anna terminus (Rs 414 cr) built by
     CMDA under DMK, completed early 2026, sat ready awaiting CM Vijay's
     inauguration; in Jun 2026 TVK launched operational add-ons framed as a win.
"""
from __future__ import annotations
import os
import sys
from pathlib import Path

# Windows console is cp1252; allow the rupee glyph in our log prints.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

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
    acts = {
        "title": "TVK credit-claim on DMK's 5 Acts (school-fee, agri-marketing…) — passed by the DMK Assembly, only notified under TVK",
        "summary": (
            "The Acts gazette-notified around 5 June 2026 (TN Government Gazette Extraordinary, "
            "Part IV-Sec 2) — headlined by the Tamil Nadu Schools (Regulation of Collection of "
            "Fee) Amendment Act 2026 and the Tamil Nadu Agricultural Produce Marketing "
            "(Regulation) Amendment Act 2026 — were Bills passed by the DMK-controlled 16th "
            "Legislative Assembly in its final session (January 2026), well before the April "
            "2026 election and before the TVK government took office (10 May 2026). The June "
            "gazette notification is the routine final administrative step, not fresh "
            "legislation. Pro-TVK media nonetheless framed the resulting private-school-fee "
            "crackdown as 'CM Vijay's key decision', attaching DMK's laws to the new CM."
        ),
        "category": "credit_stealing",
        "incident_date": "2026-06-05",
        "location": "Tamil Nadu",
        "district": None,
        "severity": 3,
        "ai_confidence": 0.88,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "is_credit_steal": True,
        "original_credit": (
            "Bills passed by the DMK 16th Legislative Assembly, final session Jan 2026: TN "
            "Schools (Regulation of Collection of Fee) Amendment Act 2026 (L.A. Bill 10/2026, "
            "passed 26 Jan 2026); TN Agricultural Produce Marketing (Regulation) Amendment Act "
            "2026; TN Panchayats (Amendment) Act 2026 (L.A. Bill 7/2026) + others. Governor's "
            "assent ~March 2026; gazette-notified ~5 June 2026 under the new TVK govt."
        ),
        "related_dmk_scheme": "DMK 16th Assembly legislation (Jan 2026) — school-fee, agri-marketing, panchayats amendments",
        "source_urls": [
            "https://educationpost.in/news/education/tamil-nadu-assembly-passes-amendment-to-regulate-private-school-fee",
            "https://www.teamleaseregtech.com/updates/article/52369/tamil-nadu-govt-issued-the-tamil-nadu-schools-regulation-of-collection/",
            "https://oktelugu.com/india/vijay-tvk-tamil-nadu-private-schools-fee-regulation-crackdown-624047.html",
            "https://www.stationeryprinting.tn.gov.in/extra_ordinary_lists.php?id=MjAyNg%3D%3D",
        ],
        "source_count": 4,
        "event_signature": "credit_stealing:tamilnadu:2026-06-05-dmk-five-acts",
        "ai_raw": {
            "tags_extra": ["credit_stealing", "governance", "legislation"],
            "people_mentioned": ["CM C. Joseph Vijay", "DMK 16th Assembly"],
            "claimed_by": ["Pro-TVK media (e.g. oktelugu)", "TVK supporters"],
            "raised_by": "Satheesh Kumar (@saysatheesh), 18 Jun 2026",
            "dmk_baseline": (
                "Every headline Act here is the work product of the DMK-majority 16th Assembly's "
                "January 2026 session. TVK's only role was the post-election gazette formality."
            ),
            "honesty_caveats": (
                "Gazette-notification is a routine step normally signed by whichever govt is in "
                "office when the file matures — the notification itself is not improper; the issue "
                "is only the claiming of the LAWS as a TVK win. Exact final Act numbers (reported "
                "~Act 7-11 of 2026) are provisional pending the gazette PDF; underlying L.A. Bill "
                "numbers and the two headline Acts are well-corroborated. TVK credit-claim evidence "
                "is media-framing-level, not a verified official TVK statement."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "member_ids": [],
        "image_urls": [],
    }
    res = db.table("incidents").insert(acts).execute()
    print(f"[ok] DMK 5-Acts credit-steal -> {res.data[0]['id'] if res.data else 'FAIL'}")

    # ---------------------------------------------------------------- 2.
    bus = {
        "title": "TVK credit-claim on Chennai's DMK-built bus termini (Kuthambakkam / Kilambakkam)",
        "summary": (
            "Every major Chennai mofussil bus terminus is a DMK/CMDA-era project that the TVK "
            "government (sworn in 10 May 2026) inherited finished or near-finished. The ₹414 cr "
            "Arignar Anna terminus at Kuthambakkam ('Kilambakkam 2.0') was built by CMDA under "
            "DMK and completed in early 2026, then sat ready for months awaiting CM Vijay's "
            "inauguration date. The ₹393.74 cr Kalaignar Centenary Bus Terminus at Kilambakkam "
            "— India's largest — was inaugurated by DMK CM M.K. Stalin on 30 Dec 2023. In June "
            "2026 the TVK government launched operational add-ons (100 standby buses, hill-route "
            "extensions) framed by media as the 'TVK government fast-tracking'. TVK built none "
            "of the terminal infrastructure."
        ),
        "category": "credit_stealing",
        "incident_date": "2026-06-16",
        "location": "Chennai",
        "district": "Chennai",
        "severity": 2,
        "ai_confidence": 0.82,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "is_credit_steal": True,
        "original_credit": (
            "Kalaignar Centenary Bus Terminus, Kilambakkam (₹393.74 cr) — inaugurated by DMK CM "
            "Stalin 30 Dec 2023; Arignar Anna Bus Terminus, Kuthambakkam (₹414 cr) — built by "
            "CMDA under DMK, completed early 2026; Broadway multi-modal hub (₹822.7 cr) — "
            "foundation laid by Stalin Jan 2026. All DMK/CMDA, none built by TVK."
        ),
        "related_dmk_scheme": "CMDA bus-terminus programme (Kilambakkam KCBT, Kuthambakkam, Broadway) — DMK 2021-26",
        "source_urls": [
            "https://timesofindia.indiatimes.com/city/chennai/414-crore-arignar-anna-bus-terminus-at-kuthambakkam-on-hold-awaits-a-date-with-cm-vijay/articleshow/131267590.cms",
            "https://tamil.oneindia.com/news/chennai/kilambakkam-bus-terminus-100-buses-and-expanded-services-for-hill-villages-tvk-government-fast-trac-808753.html",
            "https://indianexpress.com/article/cities/chennai/chennai-kilambakkam-bus-terminus-facilities-traffic-woes-9090327/",
            "https://www.newindianexpress.com/states/tamil-nadu/2025/Jun/08/aiadmk-tvk-condemn-government-over-lack-of-connectivity-to-kilambakkam-bus-terminus",
        ],
        "source_count": 4,
        "event_signature": "credit_stealing:chennai:2026-06-16-bus-terminus",
        "ai_raw": {
            "tags_extra": ["credit_stealing", "infrastructure", "transport"],
            "people_mentioned": ["CM C. Joseph Vijay", "M.K. Stalin (DMK, inaugurated KCBT 2023)"],
            "raised_by": "Satheesh Kumar (@saysatheesh), ~16 Jun 2026",
            "dmk_baseline": (
                "CMDA built Kilambakkam, Kuthambakkam and the Broadway hub under DMK. Kuthambakkam "
                "was complete and idle awaiting Vijay's inauguration; TVK added only operations."
            ),
            "honesty_caveats": (
                "The viral 'Rs 2,000 crore' figure in the source tweet matches NO single terminus "
                "(real costs are Rs 394-414 cr each) — likely an aggregate or exaggeration, so it is "
                "deliberately NOT used here. The clean, verified point is that TVK built none of "
                "the terminal infrastructure. Irony worth noting: TVK itself slammed the DMK in "
                "June 2025 for 'hurriedly' opening Kilambakkam without connectivity — the "
                "'rushed opening' critique cuts both ways."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "member_ids": [],
        "image_urls": [],
    }
    res = db.table("incidents").insert(bus).execute()
    print(f"[ok] Chennai bus-terminus credit-steal -> {res.data[0]['id'] if res.data else 'FAIL'}")

    # ---------------------------------------------------------------- Summary
    print()
    cs = db.table("incidents").select("id", count="exact").eq("category", "credit_stealing").eq("status", "approved").execute()
    print(f"==== credit_stealing approved total: {cs.count} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
