"""Seed: Chennai Metro Vadapalani-Poonamallee credit-steal (flagged by @saysatheesh,
22 Jun 2026; web-verified).

VERDICT: genuine credit-steal, PRE-EMPTIVE. The Poonamallee Bypass-Porur(-Vadapalani)
priority stretch of Chennai Metro Phase II Corridor 4 (Yellow Line) opens ~July 2026
and Tamil media already frames it as "the Vijay government's first mega gift to
Chennai." Reality: planned under AIADMK (2017-2020) but built almost entirely under
DMK (2021-2026) — civil works done mid-2025, RDSO trials Aug 2025, CMRS statutory
safety inspection 30-31 Dec 2025 — all before TVK took office (10 May 2026).
Honest caveats baked in: CM Vijay has NOT personally claimed to have built it (media
framing does the crediting); PM Modi may inaugurate (central co-financing); only the
priority stretch opens, not the full corridor.
"""
from __future__ import annotations
import os
import sys
from pathlib import Path

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
    metro = {
        "title": "Media credit-claim on Chennai Metro Vadapalani–Poonamallee stretch — built under DMK, opened under TVK",
        "summary": (
            "The Poonamallee Bypass–Porur (–Vadapalani) priority stretch of Chennai Metro "
            "Phase II, Corridor 4 (Yellow Line), is set to open around July 2026, and Tamil "
            "media already frames it as 'the Vijay government's first mega gift to Chennai'. "
            "Reality: the corridor was planned under AIADMK (2017–2020) but built almost "
            "entirely under the DMK government (2021–2026) — civil works on the cleared core "
            "finished mid-2025, RDSO safety trials ran in August 2025, and it passed the CMRS "
            "statutory safety inspection on 30–31 December 2025 — all before the TVK government "
            "took office on 10 May 2026. TVK inherited a finished, safety-cleared line and is "
            "positioned to inaugurate it. Pre-emptive call-out: CM Vijay has not personally "
            "claimed to have built it; the reattribution is in media framing, and PM Modi may "
            "actually inaugurate it given the line's central co-financing."
        ),
        "category": "credit_stealing",
        "incident_date": "2026-06-22",
        "location": "Chennai",
        "district": "Chennai",
        "severity": 2,
        "ai_confidence": 0.85,
        "verification_status": "multi_source_verified",
        "status": "approved",
        "is_credit_steal": True,
        "original_credit": (
            "Chennai Metro Phase II, Corridor 4 / Yellow Line (Light House–Poonamallee, ₹63,246 "
            "cr total, JICA/AIIB/ADB/NDB-financed) — planned under AIADMK (2017–2020 foundation), "
            "built under DMK (2021–2026): civil works done mid-2025, RDSO trials Aug 2025, CMRS "
            "safety inspection 30–31 Dec 2025. TVK took office 10 May 2026; opening ~July 2026."
        ),
        "related_dmk_scheme": "Chennai Metro Phase II / Corridor 4 (Yellow Line) — DMK 2021-26 construction",
        "source_urls": [
            "https://www.thedailyjagran.com/india/cmrs-clears-chennai-metro-phase-ii-stretch-from-poonamallee-bypass-to-porur-services-to-begin-soon-10301112",
            "https://www.dtnext.in/news/chennai/cmrl-completes-safety-certification-for-phase-2-train-coaches-to-run-from-poonamallee-to-porur-844590",
            "https://tamil.oneindia.com/news/chennai/vijay-government-s-first-mega-gift-to-chennai-poonamallee-vadapalani-metro-line-set-for-launch-soon-799287.html",
            "https://en.wikipedia.org/wiki/Yellow_Line_(Chennai_Metro)",
        ],
        "source_count": 4,
        "event_signature": "credit_stealing:chennai:2026-06-22-metro-poonamallee-vadapalani",
        "ai_raw": {
            "tags_extra": ["credit_stealing", "infrastructure", "metro", "pre_emptive"],
            "people_mentioned": ["CM C. Joseph Vijay", "CMRL", "M.K. Stalin (DMK, built it)"],
            "claimed_by": ["Tamil Oneindia / pro-TVK media ('Vijay government's first mega gift')"],
            "raised_by": "Satheesh Kumar (@saysatheesh), 22 Jun 2026",
            "dmk_baseline": (
                "Chennai Metro Phase II Corridor 4 was built and brought to CMRS safety clearance "
                "entirely under DMK (2021–early 2026). TVK inherited a finished line to open."
            ),
            "honesty_caveats": (
                "PRE-EMPTIVE: CM Vijay has NOT personally claimed to have built it — the credit "
                "framing is media-level ('Vijay government's gift'), not a Vijay quote. The "
                "corridor was PLANNED under AIADMK (2017–2020), so crediting only DMK slightly "
                "simplifies (DMK did ~95% of the build + all commissioning). PM Modi may "
                "inaugurate it (central co-financing). Only the Poonamallee Bypass–Porur(–"
                "Vadapalani) priority stretch opens in July, not the full Light House–Poonamallee "
                "corridor; several intermediate stations may stay closed at launch. The tweet's "
                "'completed in December 2025' is more precisely: civil works mid-2025, CMRS "
                "safety inspection 30–31 Dec 2025."
            ),
        },
        "press_sentiment": "negative_for_govt",
        "member_ids": [],
        "image_urls": [],
    }
    res = db.table("incidents").insert(metro).execute()
    print(f"[ok] Metro Poonamallee-Vadapalani credit-steal -> {res.data[0]['id'] if res.data else 'FAIL'}")
    cs = db.table("incidents").select("id", count="exact").eq("category", "credit_stealing").eq("status", "approved").execute()
    print(f"==== credit_stealing approved total: {cs.count} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
