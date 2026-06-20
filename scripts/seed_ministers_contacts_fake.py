"""Seed: debunked propaganda event (user ref_image — Dravidian Insights debunk).

CLAIM (FAKE, favoring TVK): @SivaDas45 ("Walter White"), 19 Jun 2026 — "For the
first time, all ministers' personal contact numbers (with official emails) are
now publicly shared on the official website ... an important step toward
transparency." Framed as a TVK-government first.

REALITY (debunked by @dstock_insights "Dravidian Insights", 19 Jun 2026,
"same template website from 2024"):
  * The TN govt "Council of Ministers" page (tn.gov.in/minister_list.php) has
    listed every minister's Email-Id AND Tel.No for years.
  * A Wayback Machine capture dated 2 Dec 2024 — under the DMK government —
    shows the EXACT same page/template with Thiru M.K. Stalin (Tel 044-25672345),
    Duraimurugan (044-25674113), Udhayanidhi Stalin etc., each with email + phone.
  * The current page is the identical template with the new TVK cabinet's names
    (C. Joseph Vijay, N. Anand, Aadhav Arjuna...).
  HONEST NOTE: publishing ministers' contacts IS good transparency — the only
  falsehood is the "for the first time" claim; the page long predates TVK.
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

    fake = {
        "title": "FAKE: 'For the first time, TN ministers' contact numbers are public' — TVK transparency claim",
        "description": (
            "A pro-TVK account (@SivaDas45, 19 Jun 2026) claimed that 'for the first time' all "
            "ministers' personal contact numbers and official emails were now public on the TN "
            "government website, crediting the TVK government with a transparency first. Dravidian "
            "Insights (@dstock_insights) debunked it: it is 'the same template website from 2024'. "
            "The TN government's 'Council of Ministers' page (tn.gov.in/minister_list.php) has "
            "listed every minister's Email-Id AND telephone number for years — a Wayback Machine "
            "capture dated 2 December 2024, under the previous DMK government, shows the identical "
            "page/template with Thiru M.K. Stalin (Tel. 044-25672345), Duraimurugan (044-25674113), "
            "Udhayanidhi Stalin and the rest, each with email and phone. The current page is the "
            "same long-standing template, merely updated with the new cabinet's names. NOTE: "
            "publishing ministers' contacts is genuinely good transparency — the only falsehood is "
            "the 'for the first time' framing, which erases that the page predates TVK by years."
        ),
        "propaganda_type": "manufactured_achievement",
        "favoring": "TVK",
        "platform": "twitter",
        "propaganda_url": "https://x.com/SivaDas45",
        "reach_estimate": None,
        "debunk_url": "https://x.com/dstock_insights/status/2067852323989356592",
        "debunk_source": "Dravidian Insights (@dstock_insights) — Wayback Machine archive of tn.gov.in/minister_list.php (2 Dec 2024)",
        "debunk_reach_estimate": None,
        "first_seen": "2026-06-19",
        "incident_date": "2026-06-19",
        "status": "debunked",
        "tags": [
            "transparency", "ministers_contacts", "wayback_machine",
            "manufactured_first", "dstock_insights", "recycled_2024",
        ],
        "source_urls": [
            "https://web.archive.org/web/20241202000000*/https://www.tn.gov.in/minister_list.php",
            "https://www.tn.gov.in/minister_list.php",
            "https://x.com/dstock_insights/status/2067852323989356592",
        ],
        "notes": (
            "Self-evident from the Wayback capture (2 Dec 2024, DMK era) vs the current page — same "
            "minister_list.php template, same email+phone layout. The 2024 DMK version listed both "
            "email and telephone for each minister. 'For the first time' is the false element; the "
            "transparency feature itself is a pre-existing, multi-year tn.gov.in page. Reach not "
            "quantified (no reliable impression data)."
        ),
    }
    res = db.table("propaganda_events").insert(fake).execute()
    print(f"[ok] Ministers-contacts 'first time' FAKE -> {res.data[0]['id'] if res.data else 'FAIL'}")

    pe = db.table("propaganda_events").select("id", count="exact").execute()
    print(f"==== propaganda_events total: {pe.count} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
