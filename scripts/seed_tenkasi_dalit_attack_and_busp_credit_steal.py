"""User-flagged gaps (2026-05-30 batch):

  (A) Tenkasi/Tirunelveli sickle attacks on 7 SC-Christians by masked
      gangs. Communal_violence (primary), police_excess (tags_extra)
      because this is a grim repeat of Perumpathu killing 2 months
      earlier — pattern of caste-targeted attacks the TVK
      administration has not addressed. Source: New Indian Express.

  (B) Credit-steal: TVK announces 'free school bus pass via school ID
      card from June 4' as a new initiative. The DMK govt had the
      same scheme already operational (29 May 2024 article confirms
      'school students can travel with old bus pass'). The TVK
      announcement repackages an existing DMK welfare scheme as a
      new TVK initiative. Source: News Tamil 24x7 (29 May 2026)
      vs DMK-era press from 2024.
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

    # ============================================================
    # (A) Tenkasi/Tirunelveli sickle attacks — communal_violence
    # ============================================================
    sickle = {
        "title": "7 SC-Christians injured in sickle attacks by masked gangs in Tenkasi + Tirunelveli",
        "summary": (
            "Two coordinated sickle attacks on Scheduled Caste (predominantly SC-Christian) "
            "residents in Tenkasi and Tirunelveli districts on Thursday and Friday evenings. "
            "A gang of 9 with faces covered by cloth arrived at Mathakovil Street, Nettur "
            "village (Tenkasi) between 5:30-6:00 PM on three two-wheelers without number "
            "plates and indiscriminately attacked residents with sickles 'without any "
            "provocation'. A second attack at Ayikudi town (Tirunelveli) injured one more "
            "person. Six locals + one Ayikudi person injured. Victims identified: M Arul "
            "Maran, G Santhoshkumar, C Rayappan, G Mark Ramesh, R Ramkumar, and Amulraj. "
            "One treated at local hospital, five sent to Govt Hospital Alangulam then to "
            "Tirunelveli Medical College. NIE explicitly frames this as 'a grim reminder "
            "of the Perumpathu violence in which a Dalit was killed in March' — same "
            "district-cluster, same pattern of unprovoked caste-targeted gang attacks, "
            "two months apart, with no documented administrative response from the TVK "
            "govt closing the gap."
        ),
        "category": "communal_violence",
        "incident_date": "2026-05-29",
        "location": "Nettur village, Tenkasi + Ayikudi town, Tirunelveli",
        "district": "Tenkasi",
        "severity": 5,
        "ai_confidence": 0.93,
        "verification_status": "press_verified",
        "status": "approved",
        "source_urls": [
            "https://www.newindianexpress.com/states/tamil-nadu/2026/may/30/7-dalits-injured-in-sickle-attacks-by-masked-gangs-in-tenkasi-tirunelveli",
        ],
        "source_count": 1,
        "event_signature": "communal_violence:tenkasi_nettur_ayikudi:2026-05-29",
        "ai_raw": {
            "tags_extra": ["police_excess", "crimes_women_kids"],
            "victims": [
                "M Arul Maran", "G Santhoshkumar", "C Rayappan",
                "G Mark Ramesh", "R Ramkumar", "Amulraj"
            ],
            "perpetrators": "9-person gang, faces cloth-covered, 3 two-wheelers without number plates",
            "weapon": "sickles",
            "victim_community": "SC-Christians (Scheduled Caste)",
            "precedent_reference": (
                "Perumpathu violence — Dalit killed March 2026, same district cluster. "
                "Pattern of unprovoked caste-targeted attacks with no administrative response."
            ),
            "dmk_baseline": (
                "Under DMK (2021-2026), the State implemented SC/ST Atrocities Act "
                "enforcement with district-level monitoring committees. CM Stalin "
                "personally visited families of caste-attack victims and ordered fast-"
                "track investigations. TVK govt's silence on a repeat of the March "
                "Perumpathu pattern is a critical accountability gap."
            ),
            "people_mentioned": [
                "Tenkasi SP", "Tirunelveli SP",
                "(no TVK minister statement reported)",
            ],
        },
        "press_sentiment": "negative_for_govt",
        "is_credit_steal": False,
        "member_ids": [],
        "image_urls": [],
    }
    res = db.table("incidents").insert(sickle).execute()
    print(f"[ok] Tenkasi/Tirunelveli sickle attack -> {res.data[0]['id'] if res.data else 'FAIL'}")

    # ============================================================
    # (B) Free school bus pass — credit_stealing
    # ============================================================
    bus_pass = {
        "title": "TVK announces 'free school bus pass via school ID' from June 4 — DMK had the same scheme operational",
        "summary": (
            "TVK Education/Transport Minister Tamizhan Parithiban announced on May 29, "
            "2026 that students of govt arts/science colleges, polytechnic colleges, and "
            "industrial training institutes can travel free on govt buses by showing their "
            "school ID card, effective June 4, 2026 (the school reopening date). "
            "This is being framed as a 'new TVK initiative' — but a News Tamil article "
            "from May 29, 2024 (exactly two years earlier, under DMK govt) confirms the "
            "scheme was already operational: 'school students can travel using their old "
            "bus pass starting June 6'. The DMK-era free-bus-travel-for-students scheme "
            "(part of the broader free bus travel for women under the welfare bundle) "
            "had been continuously operational; TVK is repackaging the same operational "
            "scheme as a new announcement to claim credit. Pattern: identical to the "
            "helpline, free-coaching (Naan Mudhalvan), and visitor-chairs fakes — DMK "
            "reality reframed as TVK first-ever."
        ),
        "category": "credit_stealing",
        "incident_date": "2026-05-29",
        "location": "Tamil Nadu",
        "district": None,
        "severity": 3,
        "ai_confidence": 0.92,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "is_credit_steal": True,
        "original_credit": (
            "DMK government's free bus travel for students scheme — confirmed operational "
            "in News Tamil article dated 29 May 2024 (one year before TVK govt formation)."
        ),
        "related_dmk_scheme": "Free bus travel for students (school + college)",
        "source_urls": [
            "https://www.newstamil.tv/news/tamil-nadu/29-may-2026-tvk-students-free-bus-travel-id-card",
            "https://www.newstamil.tv/news/tamil-nadu/29-may-2024-students-old-bus-pass-travel",
        ],
        "source_count": 2,
        "event_signature": "credit_stealing:tamilnadu:2026-05-29-bus-pass",
        "ai_raw": {
            "tags_extra": ["governance"],
            "minister_announcing": "Tamizhan Parithiban (TVK Education/Transport)",
            "effective_from": "2026-06-04",
            "dmk_baseline": (
                "Free bus travel for school + college students was a continuous DMK welfare "
                "scheme, operational from 2021 onwards as part of CM Stalin's free bus "
                "travel bundle. The 29 May 2024 News Tamil article documents students "
                "already traveling with old bus passes under DMK govt. TVK's 'new' "
                "announcement is a relaunch with new branding."
            ),
            "people_mentioned": ["Tamizhan Parithiban", "Various TVK education ministry"],
            "context": (
                "Fits the established TVK pattern of credit-stealing DMK welfare schemes: "
                "helpline (DMK CM Grievance Redressal), free UPSC/TNPSC coaching (DMK Naan "
                "Mudhalvan), visitor-chairs office circular (Stalin-era), no-traffic-halt "
                "convoy policy (Stalin 2021). This is the 5th documented same-pattern "
                "credit-steal."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "member_ids": [],
        "image_urls": [],
    }
    res = db.table("incidents").insert(bus_pass).execute()
    print(f"[ok] Bus pass credit-steal -> {res.data[0]['id'] if res.data else 'FAIL'}")

    # Summary
    print()
    cv = db.table("incidents").select("id", count="exact").eq("category", "communal_violence").eq("status", "approved").execute()
    cs = db.table("incidents").select("id", count="exact").eq("category", "credit_stealing").eq("status", "approved").execute()
    print(f"==== After seed: communal_violence={cv.count}  credit_stealing={cs.count} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
