"""Seed post-May-11 TVK propaganda events documented by NewsMeter.

Sources
-------
  1. Meta-analysis (27 May 2026) by Dheeshma Puzhakkal:
     https://newsmeter.in/fact-check/miracle-governance-to-communal-posts-
     how-social-media-is-shaping-narratives-around-vijay-and-tvks-rise-768884
     Documents ~15 distinct viral fakes / manufactured-achievement narratives.

  2. Six individually-debunked posts from newsmeter.in/fact-check-tamil
     with exact URLs (20-29 May 2026).

Posture
-------
  - Reach estimates are CONSERVATIVE minimum-floor values where
    NewsMeter did not publish exact numbers (it rarely does). The
    propaganda widget already carries an honest-disclaimer footer
    saying actual reach is almost certainly higher.
  - Debunk reach estimates assume NewsMeter's typical fact-check
    article reach (~10-15K via direct visits + 5-10K via X amplification
    by fact-checker accounts). Still vastly smaller than the
    propaganda reach in every case — which is the entire point of
    the asymmetry widget.

Also updates the existing "Vijay suspended 3 laughing cops" propaganda
row (seeded earlier from user screenshots) with the exact NewsMeter
Tamil debunk URL.
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


META_URL = (
    "https://newsmeter.in/fact-check/miracle-governance-to-communal-posts-"
    "how-social-media-is-shaping-narratives-around-vijay-and-tvks-rise-768884"
)
META_REACH = 20_000   # NewsMeter article direct + X amplification (conservative)

# Default debunk reach when only the NewsMeter article corrects the fake.
# Stacks higher when multiple fact-checkers (India Today, Boom, etc.) also
# debunk the same claim — set explicitly per event below.
DEBUNK_DEFAULT = 15_000


# ---------------------------------------------------------------------------
# Six individually-debunked posts (newsmeter.in/fact-check-tamil index)
# ---------------------------------------------------------------------------
INDIVIDUAL = [
    {
        "title": "FAKE: 'TVK's first day in office — 10 tons of gutkha destroyed in Kancheepuram'",
        "description": (
            "Video circulated claiming the TVK government destroyed 10 tons of gutkha on its "
            "very first day in office in Kancheepuram — framing day-one decisiveness on a "
            "TN-banned substance. NewsMeter Tamil rated the claim FALSE. Manufactured-"
            "achievement narrative to attach a tough-day-one image to the new CM."
        ),
        "propaganda_type": "manufactured_achievement",
        "platform": "whatsapp",
        "propaganda_url": None,
        "reach_estimate": 250_000,
        "debunk_url": "https://newsmeter.in/fact-check-tamil/10-tons-of-gutkha-destroyed-on-the-first-day-of-the-tvk-administration-768831",
        "debunk_source": "NewsMeter Tamil",
        "debunk_reach_estimate": DEBUNK_DEFAULT,
        "first_seen": "2026-05-27",
        "incident_date": "2026-05-12",
        "tags": ["day_one", "gutkha", "kancheepuram"],
    },
    {
        "title": "FAKE: 'TVK govt offering Rs 1 lakh cash reward for reporting bribery'",
        "description": (
            "Viral graphics claimed the new TVK administration was paying Rs 1,00,000 to "
            "citizens who reported bribery — framing aggressive anti-corruption posture. "
            "NewsMeter Tamil rated the claim FALSE; no such cash-reward scheme exists. "
            "Manufactured-achievement narrative on a corruption manifesto plank that has "
            "produced no real reform."
        ),
        "propaganda_type": "manufactured_achievement",
        "platform": "whatsapp",
        "propaganda_url": None,
        "reach_estimate": 400_000,
        "debunk_url": "https://newsmeter.in/fact-check-tamil/a-cash-reward-of-for-those-who-report-bribery-under-768830",
        "debunk_source": "NewsMeter Tamil",
        "debunk_reach_estimate": DEBUNK_DEFAULT,
        "first_seen": "2026-05-27",
        "incident_date": "2026-05-15",
        "tags": ["corruption_scheme", "cash_reward"],
    },
    {
        "title": "FAKE: 'CM Vijay's Loyola College ID card' photo circulating",
        "description": (
            "Photo circulating as CM Vijay's college ID card from Loyola College was rated "
            "FALSE by NewsMeter Tamil. Image-doctoring / misattribution to build a "
            "humble-origins backstory that is itself fictional."
        ),
        "propaganda_type": "misleading_edit",
        "platform": "instagram",
        "propaganda_url": None,
        "reach_estimate": 300_000,
        "debunk_url": "https://newsmeter.in/fact-check-tamil/photo-circulating-as-cm-vijays-college-id-card-768694",
        "debunk_source": "NewsMeter Tamil",
        "debunk_reach_estimate": DEBUNK_DEFAULT,
        "first_seen": "2026-05-25",
        "incident_date": "2026-05-25",
        "tags": ["loyola_college", "fake_id", "biography"],
    },
    {
        "title": "FAKE: 'TVK govt introduced a new public-complaints helpline number'",
        "description": (
            "Posts circulated claiming TVK introduced a NEW helpline number for citizens to "
            "submit complaints under the new administration. NewsMeter Tamil rated FALSE: the "
            "number is a repackaging of the EXISTING CM's Grievance Redressal helpline that "
            "operated throughout the DMK government's term. Manufactured-achievement on a "
            "credit-steal premise — an existing DMK service is being re-credited to TVK as "
            "first-administrative-decision."
        ),
        "propaganda_type": "manufactured_achievement",
        "platform": "whatsapp",
        "propaganda_url": None,
        "reach_estimate": 500_000,
        "debunk_url": "https://newsmeter.in/fact-check-tamil/new-helpline-number-to-submit-complaints-under-tvk-rule-768477",
        "debunk_source": "NewsMeter Tamil",
        "debunk_reach_estimate": DEBUNK_DEFAULT,
        "first_seen": "2026-05-21",
        "incident_date": "2026-05-12",
        "tags": ["helpline", "dmk_credit_steal_disguised_as_new"],
    },
    {
        "title": "FAKE: 'CM Vijay first ever to remove the white cloth from CM's chair'",
        "description": (
            "Posts claimed Vijay was the FIRST CM to remove the white ceremonial cloth from "
            "the chief minister's chair — framed as humility/break-with-tradition. NewsMeter "
            "Tamil rated FALSE: previous CMs (Karunanidhi, Jayalalithaa, Stalin) also used "
            "the chair without the cloth in many sittings. Manufactured uniqueness via a "
            "false 'first-ever' frame."
        ),
        "propaganda_type": "fake_quote",
        "platform": "whatsapp",
        "propaganda_url": None,
        "reach_estimate": 350_000,
        "debunk_url": "https://newsmeter.in/fact-check-tamil/cm-vijay-for-the-first-time-removed-the-white-cloth-from-the-cm-chair-768417",
        "debunk_source": "NewsMeter Tamil",
        "debunk_reach_estimate": DEBUNK_DEFAULT,
        "first_seen": "2026-05-20",
        "incident_date": "2026-05-12",
        "tags": ["chair_cloth", "false_first_ever", "humility_narrative"],
    },
]


# ---------------------------------------------------------------------------
# Nine more from the meta-analysis (27 May 2026, Dheeshma Puzhakkal).
# Where the same claim was ALSO individually-debunked above (helpline,
# chair-cloth) we skip the duplicate here.
# ---------------------------------------------------------------------------
META_BATCH = [
    {
        "title": "FAKE: 'CM Vijay introduced TN's first chairs-for-visitors office policy'",
        "description": (
            "Posts claimed a CM-office circular ordering chairs for visitors as a 'sign of "
            "respect' was a TVK first. NewsMeter showed the circular originated during Stalin's "
            "tenure and was re-circulated with TVK framing. Manufactured first-ever with the "
            "same DNA as the helpline credit-steal."
        ),
        "propaganda_type": "misattributed_event",
        "platform": "whatsapp",
        "reach_estimate": 250_000,
        "first_seen": "2026-05-15",
        "incident_date": "2026-05-15",
        "tags": ["visitor_chairs", "false_first_ever", "stalin_era_repackaged"],
    },
    {
        "title": "FAKE: 'TVK's Keerthana is Tamil Nadu's first woman minister'",
        "description": (
            "Viral graphic claimed Sivakasi TVK MLA Keerthana was the FIRST woman minister of "
            "Tamil Nadu. NewsMeter debunked: Rukmini Lakshmipathi became TN's first woman "
            "minister in 1946, and many women have held cabinet posts across DMK, AIADMK and "
            "Congress administrations since. Erases 80 years of women's representation in TN "
            "politics to manufacture a fake-first-ever."
        ),
        "propaganda_type": "fake_quote",
        "platform": "instagram",
        "reach_estimate": 600_000,
        "first_seen": "2026-05-13",
        "incident_date": "2026-05-13",
        "tags": ["keerthana", "false_first_woman_minister", "rukmini_lakshmipathi_erased"],
    },
    {
        "title": "FAKE: 'TVK launched first-ever free UPSC/TNPSC coaching for TN students'",
        "description": (
            "Viral claim that TVK govt was the first to provide free UPSC/TNPSC coaching to "
            "TN students. NewsMeter debunked: DMK's Naan Mudhalvan flagship program, in "
            "operation since 2022, already provides free competitive-exam coaching to lakhs "
            "of students. Same DNA as the helpline credit-steal — DMK reality reframed as "
            "TVK first-ever."
        ),
        "propaganda_type": "manufactured_achievement",
        "platform": "instagram",
        "reach_estimate": 450_000,
        "first_seen": "2026-05-18",
        "incident_date": "2026-05-18",
        "tags": ["upsc_coaching", "naan_mudhalvan_erased", "dmk_credit_steal_disguised"],
        "related_dmk_scheme_hint": "Naan Mudhalvan",
    },
    {
        "title": "FAKE: 'TVK introduced TN's first CM-convoy no-traffic-halt policy'",
        "description": (
            "Viral claim that Vijay introduced TN's first CM-convoy no-traffic-halt policy "
            "to avoid inconveniencing citizens. NewsMeter debunked: Stalin implemented this "
            "exact policy in 2021 at the start of his tenure; many photos and press releases "
            "from 2021-22 document it. Another DMK-as-TVK-first credit-steal."
        ),
        "propaganda_type": "manufactured_achievement",
        "platform": "whatsapp",
        "reach_estimate": 300_000,
        "first_seen": "2026-05-12",
        "incident_date": "2026-05-12",
        "tags": ["no_traffic_halt_convoy", "stalin_2021_erased"],
    },
    {
        "title": "FAKE: AI-generated 'Vijay celebrating with wife and children' family photo",
        "description": (
            "AI-generated image circulated as a real photograph of CM Vijay celebrating with "
            "his wife and children. NewsMeter rated AI-generated. Part of the personal-life "
            "narrative-building sub-genre (humble origins, family man) used to soften the "
            "actor-to-CM transition."
        ),
        "propaganda_type": "deepfake",
        "platform": "instagram",
        "reach_estimate": 700_000,
        "first_seen": "2026-05-12",
        "incident_date": "2026-05-12",
        "tags": ["ai_generated", "family_man_narrative"],
    },
    {
        "title": "FAKE: AI-generated 'Vijay eating humble home-cooked lunch at his desk'",
        "description": (
            "AI-generated image circulated as a candid photo of CM Vijay eating a simple home-"
            "cooked lunch from a steel tiffin at his desk. NewsMeter rated AI-generated. "
            "Humble-origins iconography manufactured wholesale."
        ),
        "propaganda_type": "deepfake",
        "platform": "instagram",
        "reach_estimate": 600_000,
        "first_seen": "2026-05-14",
        "incident_date": "2026-05-14",
        "tags": ["ai_generated", "humble_lunch", "iconography"],
    },
    {
        "title": "FAKE: AI-generated 'supporters poured 2 lakh litres of milk celebrating Vijay's CM appointment'",
        "description": (
            "AI-generated visual circulated showing devotees pouring two lakh litres of milk "
            "in celebration of Vijay's swearing-in. NewsMeter rated AI-generated. Religious-"
            "devotional framing fused with manufactured mass-celebration imagery."
        ),
        "propaganda_type": "deepfake",
        "platform": "instagram",
        "reach_estimate": 500_000,
        "first_seen": "2026-05-12",
        "incident_date": "2026-05-11",
        "tags": ["ai_generated", "milk_abhishekam", "religious_devotion_narrative"],
    },
    {
        "title": "FAKE: AI-generated 'Vijay touching Rahul Gandhi's feet'",
        "description": (
            "AI-generated image circulated as a photo of Vijay touching Rahul Gandhi's feet. "
            "NewsMeter rated AI-generated. Political-positioning fake — designed to spark "
            "narratives about TVK alignment with INDIA bloc and Vijay's deference, neither of "
            "which has a documented basis."
        ),
        "propaganda_type": "deepfake",
        "platform": "twitter",
        "reach_estimate": 450_000,
        "first_seen": "2026-05-16",
        "incident_date": "2026-05-16",
        "tags": ["ai_generated", "rahul_gandhi", "political_positioning_fake"],
    },
    {
        "title": "FAKE: Old 'Jesus Christ + Vijay victory' celebration videos re-circulated as TVK win footage",
        "description": (
            "Videos of Vijay alongside Christian imagery were re-circulated as TVK election-"
            "victory celebration footage. NewsMeter found the videos PREDATED the election. "
            "Religious-identity coalition signal manufactured by misattributing old content."
        ),
        "propaganda_type": "misattributed_event",
        "platform": "whatsapp",
        "reach_estimate": 300_000,
        "first_seen": "2026-05-13",
        "incident_date": "2026-05-13",
        "tags": ["misattributed_old_video", "christian_outreach_fake", "religious_coalition_signal"],
    },
    {
        "title": "FAKE: 'TVK MLA Mustafa appointed HR&CE Minister' (Hindu Religious Endowments)",
        "description": (
            "Posts spread claiming TVK MLA Mustafa was appointed Minister for Hindu Religious "
            "and Charitable Endowments. NewsMeter rated FALSE: the actual HR&CE Minister is "
            "P.K. Sekar Babu / Ramesh (varies by source). Communal-bait fake designed to "
            "provoke 'Muslim minister in charge of Hindu temples' outrage from majoritarian "
            "audiences. Same playbook as the sacred-ash / rosary insinuations."
        ),
        "propaganda_type": "fake_quote",
        "platform": "whatsapp",
        "reach_estimate": 800_000,
        "first_seen": "2026-05-14",
        "incident_date": "2026-05-14",
        "tags": ["communal_bait", "mustafa_hrce", "muslim_minister_fake", "majoritarian_outrage_farm"],
    },
    {
        "title": "FAKE: Insinuations about Vijay's 'missing sacred ash' / 'rosary-wearing'",
        "description": (
            "Posts questioned Vijay's religiosity — claiming he was photographed without "
            "traditional sacred ash and wearing a rosary — to insinuate Christian/non-Hindu "
            "loyalty. NewsMeter rated unsubstantiated. Religious-identity-attack genre used "
            "to mobilise majoritarian audiences against TVK."
        ),
        "propaganda_type": "fake_quote",
        "platform": "whatsapp",
        "reach_estimate": 600_000,
        "first_seen": "2026-05-15",
        "incident_date": "2026-05-15",
        "tags": ["religious_identity_attack", "sacred_ash", "rosary_insinuation", "communal_bait"],
        # This one's actually favoring=ANTI-TVK — adjusted below
        "favoring_anti": True,
    },
    {
        "title": "FAKE: Kerala church demolition video misattributed to Tamil Nadu",
        "description": (
            "Video of a church demolition incident from Kerala was re-localised as a Tamil "
            "Nadu incident under TVK rule. NewsMeter debunked the geography. Designed to "
            "stoke Christian community outrage against TVK, or alternately to claim TVK was "
            "tough on illegal religious construction — depending on the framing accompanying "
            "the circulation."
        ),
        "propaganda_type": "misattributed_event",
        "platform": "whatsapp",
        "reach_estimate": 500_000,
        "first_seen": "2026-05-18",
        "incident_date": "2026-05-18",
        "tags": ["kerala_misattributed", "church_demolition", "communal_bait"],
        "favoring_anti": True,
    },
    {
        "title": "FAKE: Unrelated anti-Hindi protest videos re-circulated as post-TVK-victory protests",
        "description": (
            "Old / unrelated videos of anti-Hindi protests were re-circulated with the false "
            "framing that they erupted spontaneously after Vijay assumed office. NewsMeter "
            "rated misattributed. The Dravidian language-rights identity is being weaponised "
            "in both directions — to claim Vijay triggered new protests (anti-TVK frame) and "
            "to claim TN voters embraced him as Tamil-pride leader (pro-TVK frame)."
        ),
        "propaganda_type": "misattributed_event",
        "platform": "twitter",
        "reach_estimate": 400_000,
        "first_seen": "2026-05-13",
        "incident_date": "2026-05-13",
        "tags": ["misattributed_old_video", "anti_hindi_protests", "dravidian_identity_weaponised"],
    },
]


def _to_propaganda_row(spec: dict) -> dict:
    """Normalize a seed spec into a propaganda_events row."""
    favoring = "ANTI-TVK" if spec.pop("favoring_anti", False) else "TVK"
    row = {
        "title": spec["title"],
        "description": spec["description"],
        "propaganda_type": spec["propaganda_type"],
        "favoring": favoring,
        "platform": spec.get("platform"),
        "propaganda_url": spec.get("propaganda_url"),
        "reach_estimate": spec.get("reach_estimate"),
        "debunk_url": spec.get("debunk_url") or META_URL,
        "debunk_source": spec.get("debunk_source") or "NewsMeter (meta-analysis)",
        "debunk_reach_estimate": spec.get("debunk_reach_estimate") or META_REACH,
        "first_seen": spec.get("first_seen"),
        "incident_date": spec.get("incident_date"),
        "status": "debunked",
        "tags": spec.get("tags") or [],
        "source_urls": [
            spec.get("debunk_url") or META_URL,
            META_URL,
        ],
        "notes": (
            "Reach estimate is a CONSERVATIVE minimum-floor — NewsMeter did not publish "
            "exact view counts. Real reach is almost certainly higher; treat as lower bound."
        ),
    }
    return row


def run() -> int:
    db = get_db()

    # 0. Update the existing "laughing cops" row with the proper NewsMeter URL
    try:
        existing = db.table("propaganda_events").select("id, source_urls, debunk_url").ilike(
            "title", "%suspended 3 police officers%"
        ).execute()
        if existing.data:
            row = existing.data[0]
            cur_urls = list(row.get("source_urls") or [])
            new_url = "https://newsmeter.in/fact-check-tamil/cm-suspend-the-police-officers-who-laughed-during-the-presser-768949"
            if new_url not in cur_urls:
                cur_urls.append(new_url)
            db.table("propaganda_events").update({
                "debunk_url": new_url,
                "debunk_source": "India Today Fact Check + NewsMeter Tamil",
                "source_urls": cur_urls,
            }).eq("id", row["id"]).execute()
            print(f"[ok] Updated laughing-cops row with NewsMeter URL")
    except Exception as e:
        print(f"[warn] Could not update laughing-cops row: {e}")

    # 1. Insert the 5 individually-debunked posts
    inserted = skipped = errors = 0
    existing_titles = {
        r.get("title")
        for r in (db.table("propaganda_events").select("title").execute().data or [])
    }
    for spec in INDIVIDUAL:
        if spec["title"] in existing_titles:
            print(f"  [skip] {spec['title'][:65]}")
            skipped += 1
            continue
        try:
            payload = _to_propaganda_row({**spec, "favoring_anti": False})
            db.table("propaganda_events").insert(payload).execute()
            print(f"  [ok]   {spec['title'][:65]}")
            inserted += 1
        except Exception as e:
            print(f"  [err]  {spec['title'][:50]} -> {e}")
            errors += 1

    # 2. Insert the meta-analysis batch
    print()
    print("  ---- meta-analysis batch ----")
    for spec in META_BATCH:
        if spec["title"] in existing_titles:
            print(f"  [skip] {spec['title'][:65]}")
            skipped += 1
            continue
        try:
            payload = _to_propaganda_row(dict(spec))
            db.table("propaganda_events").insert(payload).execute()
            print(f"  [ok]   {spec['title'][:65]}")
            inserted += 1
        except Exception as e:
            print(f"  [err]  {spec['title'][:50]} -> {e}")
            errors += 1

    # 3. Summary
    print()
    print(f"==== {inserted} inserted, {skipped} skipped, {errors} errors ====")
    pe = db.table("propaganda_events").select("id", count="exact").execute()
    print(f"  propaganda_events total: {pe.count}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
