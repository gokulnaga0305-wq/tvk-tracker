"""
Scrape TN-political content from Reddit via Apify and feed into our
incident pipeline.

Costs ~$0.00149 per Reddit post. ~300 posts/run = $0.45.

Usage:
    cd backend
    python ../scripts/scrape_reddit_tn.py

Targets r/Chennai, r/TamilNadu, r/india with political keyword filter.
Posts each relevant item to /api/ingest/manual on the production backend
so it goes through the same Claude categorization pipeline.
"""
import sys
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import settings

APIFY_ACTOR = "fatihtahta~reddit-scraper-search-fast"
BACKEND = "https://goknaga-tvk-tracker-backend.hf.space"
ADMIN_SECRET = "tvk-prod-B3OsxQgpTJbu1JF2eNwuLnEx"

TARGET_SUBREDDITS = ["Chennai", "TamilNadu"]
TIMEFRAME = "week"      # all, year, month, week, day, hour
MAX_POSTS_PER_SUB = 100

# Political / governance / incident keywords — at least one must appear
RELEVANT_KEYWORDS = [
    # TVK + officials
    "tvk", "vijay", "thalapathy", "tamilaga vettri",
    "stalin", "dmk", "kanimozhi", "udhayanidhi", "aiadmk", "palaniswami",
    # Incident types
    "murder", "rape", "assault", "arrest", "fir", "bribe", "scam",
    "corruption", "tender", "raid", "fraud", "killed", "kidnap",
    "honour killing", "honor killing", "custodial", "lockup", "lynch",
    "power cut", "blackout", "water shortage", "flood",
    "fake news", "fact check", "morphed", "deepfake", "ai generated",
    "tasmac", "liquor", "alcohol", "drug",
    # Schemes / policy
    "magalir urimai", "kalaignar", "amma canteen", "amma canteens",
    "scheme cancelled", "scheme paused", "subsidy", "rebrand",
    "broken promise", "manifesto",
    # Press freedom / civic
    "journalist arrested", "journalist raided", "press freedom",
    "industrial flight", "factory closure", "layoff",
    # Visual content cues (Tamil)
    "ஊழல்", "கொலை", "வன்கொடுமை", "மது", "விஜய்", "ஸ்டாலின்",
]


def is_relevant(post: dict) -> bool:
    blob = ((post.get("title") or "") + " " + (post.get("body") or "")).lower()
    return any(kw.lower() in blob for kw in RELEVANT_KEYWORDS)


def trigger_apify(sub: str) -> str:
    body = {
        "subredditName": sub,
        "subredditSort": "new",
        "subredditTimeframe": TIMEFRAME,
        "maxPosts": MAX_POSTS_PER_SUB,
        "scrapeComments": False,
    }
    req = urllib.request.Request(
        f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/runs?token={settings.apify_api_token}",
        data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=30).read())["data"]["id"]


def wait_for_run(run_id: str) -> dict:
    url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={settings.apify_api_token}"
    for _ in range(60):
        d = json.loads(urllib.request.urlopen(url, timeout=15).read())["data"]
        if d["status"] in ("SUCCEEDED", "FAILED", "ABORTED"):
            return d
        time.sleep(5)
    raise SystemExit("Apify run timed out")


def fetch_dataset(dataset_id: str) -> list[dict]:
    url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={settings.apify_api_token}&limit=2000"
    return json.loads(urllib.request.urlopen(url, timeout=60).read())


def submit_to_backend(post: dict) -> bool:
    title = (post.get("title") or "")[:200]
    body = post.get("body") or ""
    url = post.get("url") or post.get("permalink") or ""
    if url.startswith("/r/"):
        url = "https://www.reddit.com" + url
    text = body[:8000]
    if not text and title:
        text = title

    params = urllib.parse.urlencode({"url": url, "title": title, "text": text})
    req = urllib.request.Request(
        f"{BACKEND}/api/ingest/manual?{params}",
        method="POST",
        headers={"x-admin-secret": ADMIN_SECRET},
    )
    try:
        urllib.request.urlopen(req, timeout=30)
        return True
    except urllib.error.HTTPError as e:
        if e.code != 403:
            print(f"  WARN ingest failed: {e.code} {e.read().decode()[:120]}")
        return False


def main():
    total_relevant = 0
    total_submitted = 0
    total_cost = 0.0

    for sub in TARGET_SUBREDDITS:
        print(f"\nScraping r/{sub} (timeframe={TIMEFRAME}, max={MAX_POSTS_PER_SUB})...")
        run_id = trigger_apify(sub)
        print(f"  Run: {run_id}")
        run = wait_for_run(run_id)
        if run["status"] != "SUCCEEDED":
            print(f"  {run['status']} -- skip")
            continue
        items = fetch_dataset(run["defaultDatasetId"])
        print(f"  Raw: {len(items)} posts")
        total_cost += len(items) * 0.00149

        relevant = [p for p in items if is_relevant(p)]
        print(f"  Relevant (keyword filter): {len(relevant)}")
        total_relevant += len(relevant)

        for post in relevant:
            ok = submit_to_backend(post)
            if ok:
                total_submitted += 1

    print(f"\nDone.")
    print(f"  Total relevant: {total_relevant}")
    print(f"  Submitted to backend: {total_submitted}")
    print(f"  Apify cost: ~${total_cost:.3f}")


if __name__ == "__main__":
    main()
