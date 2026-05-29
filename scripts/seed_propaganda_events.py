"""Seed initial propaganda_events from what we've already documented.

Bootstraps the PropagandaReach widget with real, verifiable entries so
it shows useful asymmetry numbers from day one. Subsequent events get
added via /api/propaganda/ POST (admin form) or via the same script as
new fakes are caught.

Migration 016_propaganda_events.sql must be applied to Supabase first.

Reach estimates: deliberately CONSERVATIVE. The whole point of the widget
is to be honest about minimum-floor numbers and acknowledge the real
asymmetry is larger.
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


SEEDS = [
    {
        "title": "FAKE: 'CM Vijay orders TASMAC liquor crushed with JCB' viral video (actually Ahmedabad Jan 2025)",
        "description": (
            "A viral video of a JCB crushing liquor bottles set to the 'Vaathi Raid' song "
            "circulated through TVK supporter accounts during the first weeks of the new govt, "
            "with the implicit framing that CM Vijay had ordered the action under TVK's anti-"
            "alcohol push. The video was actually filmed on January 9, 2025 in Ahmedabad, "
            "Gujarat — visible in the original caption the propagators stripped. Classic "
            "manufactured-achievement narrative: real govt action (717 TASMAC closures) "
            "amplified by FAKE supporting video drama to inflate perceived scale of action."
        ),
        "propaganda_type": "misattributed_event",
        "favoring": "TVK",
        "platform": "instagram",
        "propaganda_url": "https://www.reddit.com/r/TVKFiles/comments/1tb5n9d/people_saw_a_video_of_liquor_",
        # Conservative estimate: pro-TVK reels of this kind routinely
        # crack 1M+ on Instagram. Source: r/TVKFiles community noted the
        # high spread. Marking 1M as minimum-floor.
        "reach_estimate": 1_000_000,
        "likes": None,
        "shares": None,
        "debunk_url": "https://www.reddit.com/r/TVKFiles/comments/1tb5n9d/people_saw_a_video_of_liquor_",
        "debunk_source": "Internal verification + r/TVKFiles community",
        # r/TVKFiles has a few thousand subscribers vs Instagram's millions
        "debunk_reach_estimate": 5_000,
        "first_seen": "2026-05-22",
        "incident_date": "2026-05-22",
        "status": "debunked",
        "tags": ["tasmac", "vaathi_raid", "ahmedabad_footage"],
        "source_urls": [
            "https://www.reddit.com/r/TVKFiles/comments/1tb5n9d/people_saw_a_video_of_liquor_",
        ],
        "notes": (
            "We caught this one because the propagators left the original Ahmedabad-Jan-9 "
            "caption in the clip. Most pro-TVK manufactured-achievement reels we never "
            "catch because they don't leave forensic traces. Treat this single event as "
            "representative of a much larger pattern."
        ),
    },
]


def run() -> int:
    db = get_db()
    # Check whether the migration has been applied — querying the table
    # gives us a fast yes/no without DDL access.
    try:
        existing = db.table("propaganda_events").select("id, title").execute()
        existing_titles = {r.get("title") for r in (existing.data or [])}
    except Exception as e:
        print(f"ERROR: propaganda_events table not found. Apply migration 016 first.")
        print(f"  Details: {e}")
        return 1

    inserted = 0
    skipped = 0
    for s in SEEDS:
        if s["title"] in existing_titles:
            skipped += 1
            print(f"  [skip] {s['title'][:70]}")
            continue
        try:
            res = db.table("propaganda_events").insert(s).execute()
            iid = res.data[0]["id"] if res.data else "?"
            inserted += 1
            print(f"  [ok]   {iid[:8]} :: {s['title'][:65]}")
        except Exception as e:
            print(f"  [err]  {s['title'][:60]} -> {e}")

    print()
    print(f"==== Summary: {inserted} inserted, {skipped} skipped ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
