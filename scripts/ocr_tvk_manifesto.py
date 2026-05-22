"""
OCR the 96-page TVK 2026 manifesto using Claude Haiku 4.5 (via OpenRouter)
vision and extract structured promises.

Pages 1-96 from https://tvkvijay.com/en/manifesto
CDN: https://d462xg1zgerhx.cloudfront.net/1_Page_NN.jpg

Cost estimate:
  ~96 image OCR calls via Claude Haiku 4.5 (vision-capable)
  ~$0.01-0.02 per page = $1-2 total

Usage:
    cd backend
    python ../scripts/ocr_tvk_manifesto.py [start_page] [end_page]
"""
import sys
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import settings
from app.database import get_db
from openai import OpenAI


PAGE_URL = "https://d462xg1zgerhx.cloudfront.net/1_Page_{n:02d}{suffix}.jpg"
# Pages 1-25 use "-2" suffix, 26+ are plain (per the HTML extraction)
def page_url(n: int) -> str:
    suffix = "-2" if n <= 25 else ""
    return PAGE_URL.format(n=n, suffix=suffix)


PROMPT = """This image is one page from the official TVK (Tamilaga Vettri Kazhagam)
2026 Tamil Nadu election manifesto. Extract every CONCRETE PROMISE on this page.

A promise is a specific commitment to do something — give X to Y, build Z,
deliver A within B time, etc. Skip generic ideology, slogans, statements of
intent without action.

Return JSON: {{ "promises": [{{ "text": "...", "category": "...",
"timeline": "..." or null, "target": "..." or null }}, ...] }}

Categories: women, youth, education, health, farmers, fisherfolk, msme,
weavers, industries, governance, police, judiciary, government_employees,
infrastructure, social_welfare, environment, tamil_culture, federalism,
press_freedom, anti_corruption, other.

Timelines: "100 days" / "first year" / "5 years" / null if unspecified.
Target: any concrete number (Rs amount, beneficiary count, schools etc.)
or null.

If page has NO promises (cover, table of contents, image-only), return:
{{ "promises": [] }}

Respond ONLY with JSON, no markdown."""


def ocr_page(client: OpenAI, model: str, n: int) -> list[dict]:
    url = page_url(n)
    try:
        resp = client.chat.completions.create(
            model=model,
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": url}},
                    {"type": "text", "text": PROMPT},
                ],
            }],
        )
        text = resp.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        data = json.loads(text)
        return data.get("promises", []) or []
    except json.JSONDecodeError as e:
        print(f"  page {n}: JSON decode fail")
        return []
    except urllib.error.HTTPError as e:
        print(f"  page {n}: HTTP {e.code}")
        return []
    except Exception as e:
        print(f"  page {n}: {type(e).__name__}: {str(e)[:120]}")
        return []


def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 96

    client = OpenAI(
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "https://tvk-tracker.vercel.app",
            "X-Title": "TVK Tracker",
        },
    )
    model = "anthropic/claude-haiku-4.5"
    print(f"OCRing pages {start}-{end} via {model}")

    all_promises = []
    for n in range(start, end + 1):
        print(f"\nPage {n}: {page_url(n)}")
        promises = ocr_page(client, model, n)
        print(f"  -> {len(promises)} promises")
        for p in promises[:2]:
            t = (p.get("text") or "")[:80].encode("ascii", "ignore").decode()
            print(f"     {t}")
        all_promises.extend([{**p, "page": n} for p in promises])
        time.sleep(0.5)  # gentle rate limit

    # Save all promises locally so we have a snapshot
    import os
    os.makedirs(r"C:\Users\DELL\AppData\Local\Temp\tvk", exist_ok=True)
    out_path = r"C:\Users\DELL\AppData\Local\Temp\tvk\tvk_manifesto_promises.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_promises, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(all_promises)} promises to {out_path}")

    # Load into Supabase: replace existing placeholder promises
    db = get_db()
    print(f"\nDeleting existing placeholder promises...")
    db.table("promises").delete().eq("source", "manifesto").execute()
    print(f"Inserting {len(all_promises)} real manifesto promises...")
    from datetime import date
    inserted = 0
    for p in all_promises:
        text = (p.get("text") or "").strip()
        if not text:
            continue
        try:
            db.table("promises").insert({
                "text": text[:500],
                "category": (p.get("category") or "other").lower().replace(" ", "_"),
                "made_date": "2026-04-01",
                "status": "pending",
                "source": "manifesto",
                "notes": f"Page {p.get('page')}. Timeline: {p.get('timeline') or 'unspecified'}. Target: {p.get('target') or 'unspecified'}",
            }).execute()
            inserted += 1
        except Exception as e:
            print(f"  insert FAIL: {str(e)[:120]}")

    print(f"Inserted {inserted} promises")


if __name__ == "__main__":
    main()
