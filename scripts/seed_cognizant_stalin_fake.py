"""Seed: debunked propaganda event (user ref_image, youturn fact-check).

CLAIM (FAKE, favoring TVK): pro-TVK account @sureshsamyTVK (17 Jun 2026) claimed
"the Cognizant team has never met [former CM M.K.] Stalin in the last 5 years",
using a Twitter advanced-search screenshot ("No results for from:@Cognizant
@mkstalin") as 'proof', to imply the DMK govt failed to engage Cognizant while
new TVK CM Joseph Vijay just did.

REALITY (debunked by youturn / youturn.in):
  * ~2021: Cognizant India CMD Rajesh Nambiar + senior management met CM Stalin
    (Guidance/InvestTN official post).
  * 26 Jul 2022: CM Stalin INAUGURATED Cognizant's new 5,000-seat Chennai facility
    (Ozone Techno Park, Navalur), Nambiar present; ~50,000 hiring announced.
  * The "No results" Twitter search proves nothing — TN govt-corporate meetings
    are publicized by CMO/InvestTN handles, not by @Cognizant's US handle.
    Absence of a tweet != absence of a meeting (absence-of-evidence fallacy).
  * HONEST CONCESSION: Vijay's Cognizant meeting IS real (17 Jun 2026, joint
    Nasscom+Cognizant delegation). The disinformation is only the "never met
    Stalin" coda, not the fact that Vijay met them.
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
        "title": "FAKE: 'Cognizant never met CM Stalin in 5 years — they only met CM Vijay'",
        "description": (
            "A pro-TVK account (@sureshsamyTVK, 17 Jun 2026) claimed Cognizant's team had "
            "'never met [former CM M.K.] Stalin in the last 5 years', offering a Twitter "
            "advanced-search screenshot ('No results for from:@Cognizant @mkstalin') as proof — "
            "to imply the DMK government (2021-26) failed to engage Cognizant while new TVK CM "
            "Joseph Vijay just attracted them. The Tamil fact-checker youturn debunked it: "
            "Cognizant's India leadership demonstrably met Stalin on dated, officially-"
            "publicised occasions — Cognizant India CMD Rajesh Nambiar and senior management "
            "met CM Stalin in 2021 (Guidance/InvestTN post), and on 26 July 2022 CM Stalin "
            "personally INAUGURATED Cognizant's new ~5,000-seat Chennai facility (Ozone Techno "
            "Park, Navalur) with Nambiar present, alongside a ~50,000 hiring announcement. The "
            "'No results' search is evidentially worthless: TN government–corporate meetings "
            "are publicised by the CMO / Guidance-InvestTN handles and the executives' own "
            "accounts, not by Cognizant's US corporate handle — absence of a tweet is not "
            "absence of a meeting. NOTE: Vijay's own Cognizant meeting is genuine (17 Jun 2026, "
            "a joint Nasscom + Cognizant delegation); the falsehood is purely the 'never met "
            "Stalin' disparagement bolted onto it."
        ),
        "propaganda_type": "manufactured_achievement",
        "favoring": "TVK",
        "platform": "twitter",
        "propaganda_url": "https://x.com/sureshsamyTVK",
        "reach_estimate": None,
        "debunk_url": "https://youturn.in/",
        "debunk_source": "youturn (youturn.in) — Tamil fact-check; corroborated by DTNext + Guidance/InvestTN",
        "debunk_reach_estimate": None,
        "first_seen": "2026-06-17",
        "incident_date": "2026-06-17",
        "status": "debunked",
        "tags": [
            "cognizant", "stalin", "disinformation", "false_comparison",
            "youturn", "twitter_search_fallacy", "investment",
        ],
        "source_urls": [
            "https://www.dtnext.in/city/2022/07/26/stalin-inaugurates-cognizants-new-chennai-facility",
            "https://in.linkedin.com/posts/investtn_thriveintn-investintn-activity-6853586328093892608--66-",
            "https://www.webnewswire.com/2026/06/17/tamil-nadu-cm-vijay-fulfills-tech-leaders-from-nasscom-cognizant/",
            "https://youturn.in/",
        ],
        "notes": (
            "Classic 'absence-of-evidence-as-evidence' fallacy weaponised as proof. The real, "
            "verifiable record: Nambiar–Stalin 2021 meeting + Stalin inaugurating Cognizant's "
            "Chennai facility 26 Jul 2022. Honest concession baked into the entry: Vijay DID "
            "meet Cognizant/Nasscom on 17 Jun 2026 — only the 'DMK never engaged Cognizant' "
            "claim is false. Reach not quantified (no reliable impression data on the source post)."
        ),
    }
    res = db.table("propaganda_events").insert(fake).execute()
    print(f"[ok] Cognizant-Stalin FAKE propaganda -> {res.data[0]['id'] if res.data else 'FAIL'}")

    pe = db.table("propaganda_events").select("id", count="exact").execute()
    print(f"==== propaganda_events total: {pe.count} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
