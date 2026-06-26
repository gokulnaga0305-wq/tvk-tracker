"""Seed: debunked propaganda (user ref tweets @Mrblackvk + @niranjan2428).

CLAIM (FAKE, favoring TVK): circulating on pro-TVK social media (attributed to
TVK Minister Aadhav Arjuna) that CM Vijay is the FIRST / ONLY Chief Minister in
India to run a (3 km) "marathon", after he joined an anti-drug awareness run in
Chennai on 26 Jun 2026.

REALITY (debunked):
  * FALSE "first": J&K CM Omar Abdullah ran a 21 km HALF-MARATHON for a
    "drug-free J&K" along Dal Lake, Srinagar on 20 Oct 2024 — the SAME anti-drug
    theme, ~7x longer, 20 months earlier. Other CMs (Rajasthan, West Bengal) have
    also run / led marathons.
  * "3 km marathon" is a misnomer — a marathon is 42.195 km; 3 km is a fun run.
  HONEST CAVEATS: Vijay's anti-drug run on 26 Jun 2026 is REAL (ANI/News Today).
  The exact "first CM" wording is NOT confirmed in mainstream reporting as the
  minister's on-record quote — it's social-media-circulated; but the claim's
  substance ("first CM to run a marathon") is independently false.
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
    fake = {
        "title": "FAKE: 'CM Vijay is the first Chief Minister in India to run a (3 km) marathon'",
        "description": (
            "Circulating on pro-TVK social media (attributed to TVK Minister Aadhav Arjuna): "
            "the claim that CM C. Joseph Vijay is the FIRST / ONLY Chief Minister in India to run "
            "a '3 km marathon', after he joined an anti-drug awareness run ('Start Run, Stop "
            "Drugs') in Chennai on 26 June 2026. FALSE: J&K Chief Minister Omar Abdullah ran a "
            "21 km HALF-MARATHON for a 'drug-free Jammu & Kashmir' along Dal Lake, Srinagar on "
            "20 October 2024 — the same anti-drug theme, roughly 7× longer, and 20 months "
            "earlier. Other Chief Ministers (Rajasthan, West Bengal) have also run or led "
            "marathons. The framing is doubly wrong: a marathon is 42.195 km — a 3 km event is a "
            "fun run, not a marathon. NOTE: Vijay's anti-drug run did happen; the falsehood is "
            "only the 'first/only CM' boast bolted onto it."
        ),
        "propaganda_type": "manufactured_achievement",
        "favoring": "TVK",
        "platform": "twitter",
        "propaganda_url": "https://x.com/Mrblackvk/status/2070357352100893078",
        "reach_estimate": None,
        "debunk_url": "https://thefederal.com/category/states/north/jammu-and-kashmir/omar-abdullah-runs-21-km-half-marathon-for-a-drug-free-jk-151356",
        "debunk_source": "X users @Mrblackvk & @niranjan2428; corroborated by The Federal / ETV Bharat (Omar Abdullah's 21 km run, Oct 2024)",
        "debunk_reach_estimate": None,
        "first_seen": "2026-06-26",
        "incident_date": "2026-06-26",
        "status": "debunked",
        "tags": ["marathon", "false_first", "manufactured_achievement", "anti_drug", "omar_abdullah", "aadhav_arjuna"],
        "source_urls": [
            "https://www.aninews.in/news/national/general-news/chennai-tamil-nadu-cm-vijay-flags-off-start-run-stop-drugs-anti-drug-awareness-run20260626102939/",
            "https://thefederal.com/category/states/north/jammu-and-kashmir/omar-abdullah-runs-21-km-half-marathon-for-a-drug-free-jk-151356",
            "https://www.etvbharat.com/en/!state/jk-chief-minister-omar-abdullah-leads-kashmir-marathon-completes-21-km-half-marathon-enn24102001897",
        ],
        "notes": (
            "A false-'first' / manufactured-achievement claim. Strongest counter-fact: Omar "
            "Abdullah's documented 21 km anti-drug half-marathon (20 Oct 2024) predates and "
            "dwarfs Vijay's 3 km run. Honest caveats: (1) Vijay's 26 Jun 2026 anti-drug run is "
            "real; (2) the exact 'first CM' quote is social-media-circulated, not confirmed in "
            "mainstream reporting as Min. Aadhav Arjuna's on-record words — but the substance is "
            "independently false; (3) '3 km marathon' is itself a misnomer. Reach not quantified."
        ),
    }
    res = db.table("propaganda_events").insert(fake).execute()
    print(f"[ok] Marathon 'first CM' FAKE -> {res.data[0]['id'] if res.data else 'FAIL'}")
    pe = db.table("propaganda_events").select("id", count="exact").execute()
    print(f"==== propaganda_events total: {pe.count} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
