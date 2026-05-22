"""
One-shot loader for DMK official achievements (dmk.in/en/achievements).

Pulls all 387 achievements from the party's official website (Next.js SSR
__NEXT_DATA__ JSON) and inserts them into the `dmk_announcements` table.

Run once after migration 006_dmk_announcements_archive.sql has been applied:

    cd backend
    python ../scripts/load_dmk_achievements.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.
"""
import sys
import json
import re
import urllib.request
from pathlib import Path

# Allow imports from backend/app
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import settings
from app.database import get_db

DMK_URL = "https://www.dmk.in/en/achievements/"
# Use the start of Stalin's tenure as a placeholder for items that aren't
# date-stamped on the source page. The matcher relies on content/keywords,
# so the exact date isn't critical for cross-reference purposes.
DEFAULT_DATE = "2021-05-07"


def fetch_achievements() -> list[dict]:
    req = urllib.request.Request(DMK_URL, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", errors="replace")

    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise SystemExit("Could not find __NEXT_DATA__ on dmk.in achievements page")
    data = json.loads(m.group(1))
    return data["props"]["pageProps"].get("articles", [])


def tag_to_category(tags: list[str]) -> list[str]:
    """Map dmk.in's category tags to lowercase snake_case tags we use elsewhere."""
    out = []
    for t in tags or []:
        out.append(t.lower().replace(" ", "_").replace("&", "and"))
    return out


def main():
    db = get_db()

    # Quick smoke check that table exists
    try:
        db.table("dmk_announcements").select("id").limit(1).execute()
    except Exception as e:
        raise SystemExit(
            f"Table dmk_announcements not found. Did you run "
            f"database/006_dmk_announcements_archive.sql?\nError: {e}"
        )

    articles = fetch_achievements()
    print(f"Fetched {len(articles)} achievements from {DMK_URL}")

    inserted = 0
    skipped = 0
    failed = 0

    for a in articles:
        title = (a.get("title") or "").strip()
        desc = (a.get("description") or "").strip()
        if not title:
            skipped += 1
            continue

        external_id = f"dmk_web_{a.get('id')}"
        # Skip if already imported (idempotent)
        existing = (
            db.table("dmk_announcements")
            .select("id")
            .eq("source", "dmk_website")
            .eq("external_id", external_id)
            .execute()
        )
        if existing.data:
            skipped += 1
            continue

        payload = {
            "source": "dmk_website",
            "source_url": DMK_URL,
            "external_id": external_id,
            "announcement_date": DEFAULT_DATE,
            "title": title,
            "content": desc,
            "media_urls": [a["thumbnail"]] if a.get("thumbnail") else [],
            "tags": tag_to_category(a.get("tags")),
            "raw_data": a,
        }
        try:
            db.table("dmk_announcements").insert(payload).execute()
            inserted += 1
        except Exception as e:
            print(f"  FAIL [{title[:50]}]: {e}")
            failed += 1

    print(f"\nDone. inserted={inserted}, skipped={skipped}, failed={failed}")


if __name__ == "__main__":
    main()
