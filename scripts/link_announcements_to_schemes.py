"""
One-shot: scan dmk_announcements and link each one to a dmk_schemes row
(via scheme_id) by matching scheme name + aliases against title/content.

Run after loading the archive (load_dmk_achievements.py + scrape_twitter_archive.py).

    cd backend
    python ../scripts/link_announcements_to_schemes.py
"""
import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.database import get_db


def normalize(s: str) -> str:
    """Lowercase + collapse non-alphanumeric to spaces."""
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower())


def main():
    db = get_db()

    # Load all schemes with their alias list
    schemes_res = db.table("dmk_schemes").select("id, name, aliases").execute()
    schemes = schemes_res.data or []
    print(f"Loaded {len(schemes)} DMK schemes for matching")

    # Pre-compute lowercase matchers
    matchers = []
    for s in schemes:
        # Build candidate strings: name + each alias
        candidates = [s["name"]] + (s.get("aliases") or [])
        normalized = [normalize(c) for c in candidates if c]
        # Keep only longer-than-3-char tokens to avoid false matches on 'tn', 'cm'
        normalized = [c for c in normalized if len(c) >= 4]
        matchers.append({"id": s["id"], "name": s["name"], "tokens": normalized})

    # Walk dmk_announcements in pages of 500
    offset = 0
    total_linked = 0
    total_scanned = 0
    page_size = 500
    while True:
        res = (
            db.table("dmk_announcements")
            .select("id, title, content, scheme_id")
            .is_("scheme_id", "null")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = res.data or []
        if not rows:
            break

        for row in rows:
            total_scanned += 1
            blob = normalize((row.get("title") or "") + " " + (row.get("content") or ""))

            best_match = None
            for m in matchers:
                for tok in m["tokens"]:
                    if tok in blob:
                        best_match = m
                        break
                if best_match:
                    break

            if best_match:
                try:
                    db.table("dmk_announcements").update({
                        "scheme_id": best_match["id"],
                        "scheme_name_hint": best_match["name"],
                    }).eq("id", row["id"]).execute()
                    total_linked += 1
                except Exception as e:
                    print(f"  FAIL link {row['id']}: {e}")

        offset += page_size
        print(f"  scanned={total_scanned}, linked={total_linked} so far")

    print(f"\nDone. Scanned {total_scanned} announcements, linked {total_linked}.")


if __name__ == "__main__":
    main()
