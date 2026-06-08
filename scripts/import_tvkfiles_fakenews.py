"""Import the fakenews tracker from tvkfiles.pages.dev (discovery, not
trust-clone).

Their /fakenews page is well-curated; our own propaganda_events feed froze
when the NewsMeter scraper wasn't scheduled. This fills the gap: pulls
their list (JS-rendered via Jina), SKIPS topics we already cover (to avoid
EN/TA duplicate cards), and inserts the rest into propaganda_events with
clear attribution back to them. Idempotent — re-running won't duplicate.

No AI needed (Jina render + parse + insert). Run locally or via cron.
"""
from __future__ import annotations
import os, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
_env = ROOT / "backend" / ".env"
if _env.exists():
    for _l in _env.read_text(encoding="utf-8").splitlines():
        if "=" in _l and not _l.startswith("#"):
            k, _, v = _l.partition("="); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# Tamil keyword fragments for fakes we ALREADY have in English — skip these.
SKIP_KEYWORDS = [
    "குட்கா", "லஞ்ச", "1100", "கடன்களையும்", "கேரள தேவாலய", "போட்டித் தேர்வு பயிற்சி",
    "நாற்காலி", "கீர்த்தனா", "பாலாபிஷேக", "வெள்ளை அறிக்கை", "உணவருந்த", "காவலரைத் தாக்கும்",
    "பேருந்தில் செல்லும்", "தமிழ்த்தாய்", "சிரித்த காவல்", "டாஸ்மாக் கடை உடனே",
]
TYPE_MAP = {
    "Misattribution": "misattributed_event", "Media Fake": "misleading_edit",
    "Political": "manufactured_achievement", "Politics": "manufactured_achievement",
    "Fabricated Content": "other", "AI Fake": "deepfake", "Governance": "other",
}

def fetch_items() -> list[dict]:
    req = urllib.request.Request("https://r.jina.ai/https://tvkfiles.pages.dev/fakenews",
                                 headers={"User-Agent": "Mozilla/5.0", "X-Return-Format": "markdown"})
    txt = urllib.request.urlopen(req, timeout=70).read().decode("utf-8", "replace")
    body = txt[txt.find("Markdown Content"):] if "Markdown Content" in txt else txt
    lines = [l.strip() for l in body.splitlines() if l.strip()]
    out, i = [], 0
    while i < len(lines):
        if re.fullmatch(r"\d{2}", lines[i]) and i + 2 < len(lines):
            title = lines[i + 1].rstrip("⭐").strip()
            m = re.match(r"(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(FALSE|MISLEADING|TRUE)", lines[i + 2])
            if m and title and not title.lower().startswith("false"):
                out.append({"date": m.group(1), "type": m.group(2).strip(), "verdict": m.group(3), "title": title})
            i += 3
        else:
            i += 1
    return out

def main() -> int:
    from app.database import get_db
    db = get_db()
    items = fetch_items()
    print(f"fetched {len(items)} parsed items from tvkfiles fakenews")
    existing = {(r.get("title") or "").strip() for r in
                (db.table("propaganda_events").select("title").execute().data or [])}
    added = skipped_dupe = skipped_have = 0
    for it in items:
        t = it["title"]
        if any(k in t for k in SKIP_KEYWORDS):
            skipped_have += 1; continue
        if t in existing:
            skipped_dupe += 1; continue
        db.table("propaganda_events").insert({
            "title": t,
            "propaganda_type": TYPE_MAP.get(it["type"], "other"),
            "favoring": "TVK",
            "platform": "social media",
            "first_seen": it["date"],
            "incident_date": it["date"],
            "status": "debunked",
            "debunk_source": "TVK Files (tvkfiles.pages.dev)",
            "debunk_url": "https://tvkfiles.pages.dev/fakenews",
            "notes": f"Imported from tvkfiles.pages.dev fakenews tracker. Type: {it['type']}. Verdict: {it['verdict']}.",
        }).execute()
        added += 1
        print(f"  + {it['date']} [{it['type']}] {t[:50]}")
    print(f"\nDone. added={added}  skipped(already-have-topic)={skipped_have}  skipped(exact-dupe)={skipped_dupe}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
