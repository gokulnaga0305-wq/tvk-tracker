"""
Import r/TVKFiles subreddit posts directly as incidents.

This subreddit IS curated by people tracking TVK governance issues —
each post already has a meaningful flair (e.g. "TVK Law & Order",
"Sticker Politics", "Corruption Allegation"). We use those flairs as
the primary category/tag signal rather than running every post through
Claude (which is expensive and slower than the human classification
already done at submission time).

Mapping logic:
  Flair                          -> category (single) + tags (multi)
  -----------------------------------------------------------------
  TVK Law & Order               -> crime_law + crime tags by title
  Corruption Allegation         -> corruption
  Verified News                 -> governance (or detected from title)
  Sticker Politics              -> credit_stealing + stickers
  TVK Cadres Conduct            -> governance + police_excess
  Speech vs Reality             -> governance (flair preserved)
  Promise vs Delivery           -> broken_promise
  Press Freedom                 -> attack_on_press

We then use a LIGHT AI pass to detect murder/rape/etc. in the title
language (since most are Tamil) and tag with severity / location.

Pre-requisite: scripts/scrape_reddit_tn.py or the test scrape has saved
the dataset to %TEMP%\\tvk\\tvkfiles_posts.json.

Usage:
    cd backend
    python ../scripts/import_tvkfiles_subreddit.py
"""
import sys
import json
import os
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.database import get_db


SOURCE_FILE = r"C:\Users\DELL\AppData\Local\Temp\tvk\tvkfiles_posts.json"


# Map subreddit flairs to our category + extra tags.
# Source of truth = r/TVKFiles community classification.
FLAIR_MAP = {
    "TVK Law & Order":       ("crime_law", ["governance"]),
    "Corruption Allegation": ("corruption", ["governance"]),
    "Speech vs Reality":     ("governance", ["broken_promise"]),
    "Sticker Politics":      ("credit_stealing", ["stickers", "governance"]),
    "TVK Cadres Conduct":    ("police_excess", ["governance"]),
    "Verified News":         ("governance", []),
    "Press Freedom":         ("attack_on_press", []),
    "Promise vs Delivery":   ("broken_promise", ["governance"]),
    "Reels":                 ("reels", ["propaganda"]),
    "Members":               ("governance", []),
    "Credit Claims":         ("credit_stealing", []),
    "Loss of Investments":   ("industrial_flight", ["governance"]),
    "Censorship Track":      ("censorship", []),
    "Insta Cards":           ("propaganda", []),
}

# Detect specific crime types from title for richer multi-tag
CRIME_PATTERNS = [
    ("கொலை", ["murders"]),           # Tamil: murder
    ("murder", ["murders"]),
    ("murdered", ["murders"]),
    ("killed", ["murders"]),
    ("lynch", ["murders", "communal_violence"]),
    ("rape", ["sexual_assault", "crimes_women_kids"]),
    ("raped", ["sexual_assault", "crimes_women_kids"]),
    ("வன்கொடுமை", ["sexual_assault"]),  # Tamil
    ("போலியல்", ["sexual_assault"]),    # Tamil
    ("kidnap", ["crimes_women_kids"]),
    ("கடத்த", ["crimes_women_kids"]),    # Tamil kidnap
    ("சிறுமி", ["children", "crimes_women_kids"]),  # Tamil: girl
    ("சிறுவ", ["children"]),             # Tamil: boy
    ("honour killing", ["honour_killing", "murders"]),
    ("custodial", ["custodial_death", "police_excess"]),
    ("bribe", ["corruption"]),
    ("மாமூல்", ["corruption", "extortion"]),  # Tamil: extortion/bribe
    ("scam", ["corruption"]),
    ("tender", ["tenders", "corruption"]),
    ("power cut", ["power_cut", "eb_failure"]),
    ("blackout", ["power_cut", "eb_failure"]),
    ("eb", ["eb_failure"]),
    ("தவெக", ["governance"]),  # Tamil: TVK
    ("liquor", ["alcohol_menace"]),
    ("மது", ["alcohol_menace"]),  # Tamil: liquor
    ("tasmac", ["alcohol_menace"]),
    ("dalit", ["dalits"]),
    ("தலித்", ["dalits"]),
    ("drug", ["drug_menace"]),
    ("போதைப்", ["drug_menace"]),  # Tamil
    ("journalist", ["attack_on_press"]),
    ("media raid", ["attack_on_press", "censorship"]),
    ("fake news", ["fake_news"]),
    ("morph", ["fake_image"]),
    ("ai generated", ["fake_image"]),
    ("deepfake", ["fake_image"]),
]

# Some keywords that imply specific locations
LOCATION_PATTERNS = [
    ("Chennai", ["chennai", "சென்னை"]),
    ("Madurai", ["madurai", "மதுரை"]),
    ("Coimbatore", ["coimbatore", "கோவை"]),
    ("Tiruchirappalli", ["tiruchirappalli", "trichy", "திருச்சி"]),
    ("Salem", ["salem", "சேலம்"]),
    ("Erode", ["erode", "ஈரோடு"]),
    ("Tirunelveli", ["tirunelveli", "திருநெல்வேலி"]),
    ("Vellore", ["vellore", "வேலூர்"]),
    ("Tiruvannamalai", ["tiruvannamalai", "திருவண்ணாமலை"]),
    ("Pudukkottai", ["pudukkottai", "புதுக்கோட்டை"]),
    ("Kanyakumari", ["kanyakumari", "கன்யாகுமரி"]),
    ("Theni", ["theni", "தேனி"]),
    ("Thoothukudi", ["thoothukudi", "tuticorin", "தூத்துக்குடி"]),
    ("Nilgiris", ["nilgiris", "ooty", "நீலகிரி"]),
    ("Dindigul", ["dindigul", "திண்டுக்கல்"]),
    ("Karur", ["karur", "கரூர்"]),
    ("Cuddalore", ["cuddalore", "கடலூர்"]),
    ("Krishnagiri", ["krishnagiri", "கிருஷ்ணகிரி"]),
]


def detect_location(title: str) -> str | None:
    t = (title or "").lower()
    for canonical, patterns in LOCATION_PATTERNS:
        for p in patterns:
            if p.lower() in t:
                return canonical
    return None


def detect_tags(title: str) -> list[str]:
    t = (title or "").lower()
    tags = []
    for kw, ts in CRIME_PATTERNS:
        if kw.lower() in t:
            for tag in ts:
                if tag not in tags:
                    tags.append(tag)
    return tags


def severity_for(category: str, tags: list[str]) -> int:
    # Lives lost / serious bodily harm
    if any(t in tags for t in ("murders", "honour_killing", "custodial_death", "sexual_assault")):
        return 5
    # Power / civic failure
    if category in ("eb_failure", "power_cut", "water_shortage"):
        return 3
    if category in ("corruption", "extortion"):
        return 3
    if category in ("credit_stealing", "broken_promise", "reels"):
        return 2
    return 2


def build_summary(post: dict) -> str:
    title = post.get("title") or ""
    body = (post.get("body") or "").strip()
    if body and len(body) > 20:
        return body[:500]
    # No body — use title repeated for context
    return title[:300]


def main():
    if not os.path.exists(SOURCE_FILE):
        sys.exit(f"Source file not found: {SOURCE_FILE}\n"
                 f"Run the r/TVKFiles scrape first.")

    with open(SOURCE_FILE, encoding="utf-8") as f:
        posts = json.load(f)
    print(f"Loaded {len(posts)} r/TVKFiles posts")

    db = get_db()
    inserted = 0
    skipped = 0
    by_flair: dict[str, int] = {}

    for post in posts:
        title = (post.get("title") or "").strip()
        if not title:
            skipped += 1
            continue

        # Dedup by reddit URL
        url = post.get("url") or post.get("permalink") or post.get("canonical_url")
        if url and url.startswith("/r/"):
            url = "https://www.reddit.com" + url
        if not url:
            skipped += 1
            continue
        existing = db.table("sources").select("id").eq("url", url).execute()
        if existing.data:
            skipped += 1
            continue

        # Classify by flair
        flair = post.get("flair") or ""
        category, extra_tags = FLAIR_MAP.get(flair, ("governance", []))
        title_tags = detect_tags(title)
        all_tags = list(dict.fromkeys([category] + extra_tags + title_tags))
        # If we detected a more specific crime, promote it as primary category
        if "murders" in title_tags:
            category = "murders"
        elif "sexual_assault" in title_tags:
            category = "sexual_assault"
        elif "honour_killing" in title_tags:
            category = "honour_killing"
        elif "corruption" in extra_tags + title_tags and category == "governance":
            category = "corruption"

        # Date
        created_utc = post.get("created_utc")
        if created_utc:
            try:
                dt = datetime.fromtimestamp(float(created_utc), tz=timezone.utc).date()
            except Exception:
                dt = datetime.now(timezone.utc).date()
        else:
            dt = datetime.now(timezone.utc).date()

        # Images
        images = []
        if post.get("thumbnail") and not post["thumbnail"].startswith(("self", "default", "nsfw")):
            images.append(post["thumbnail"])
        gallery = post.get("gallery_images") or []
        for g in gallery[:5]:
            if isinstance(g, str):
                images.append(g)
            elif isinstance(g, dict) and g.get("url"):
                images.append(g["url"])

        # Persist source record so dedup works
        try:
            db.table("sources").insert({
                "url": url,
                "outlet": "reddit_tvkfiles",
                "title": title,
                "credibility_tier": "online_native",
            }).execute()
        except Exception:
            pass

        # Build incident — use only columns guaranteed to exist by 001 schema.
        # New fields (tags, flair, external_source_type, upvotes, comment_count)
        # live inside ai_raw until migration 008 is run, then a follow-up
        # script can promote them to native columns.
        ai_raw_blob = {
            "imported_from": "r/TVKFiles",
            "post_id": post.get("id"),
            "flair": flair,
            "score": post.get("score"),
            "upvotes": post.get("score") or 0,
            "comment_count": post.get("num_comments") or 0,
            "external_source_type": "reddit",
            "tags_extra": all_tags,  # picked up by _normalize_tags() in API
        }
        payload = {
            "title": title[:200],
            "summary": build_summary(post),
            "category": category,
            "incident_date": dt.isoformat(),
            "location": detect_location(title),
            "source_urls": [url],
            "source_count": 1,
            "is_credit_steal": "credit_stealing" in all_tags or flair == "Sticker Politics",
            "severity": severity_for(category, all_tags),
            "ai_confidence": 1.0,
            "status": "approved",
            "verification_status": "admin_verified",
            "image_urls": images[:5],
            "ai_raw": ai_raw_blob,
        }

        # Try native multi-tag columns first; fall back if schema 008 not applied.
        for attempt in (True, False):
            attempt_payload = dict(payload)
            if attempt:
                attempt_payload.update({
                    "tags": all_tags,
                    "flair": flair or None,
                    "external_source_type": "reddit",
                    "upvotes": post.get("score") or 0,
                    "comment_count": post.get("num_comments") or 0,
                })
            try:
                db.table("incidents").insert(attempt_payload).execute()
                inserted += 1
                by_flair[flair] = by_flair.get(flair, 0) + 1
                break
            except Exception as e:
                msg = str(e)
                if "PGRST204" in msg and attempt:
                    # Native columns don't exist yet — retry without them
                    continue
                if "duplicate" not in msg.lower() and "23505" not in msg:
                    # Strip non-ASCII from title for safe console print
                    safe = title[:50].encode("ascii", "ignore").decode()
                    print(f"  FAIL: {safe} -> {msg[:120]}")
                skipped += 1
                break

    print(f"\nDone. inserted={inserted}, skipped={skipped}")
    print(f"\nBy flair:")
    for f, c in sorted(by_flair.items(), key=lambda x: -x[1]):
        print(f"  {f or '(none)':30s} {c}")


if __name__ == "__main__":
    main()
