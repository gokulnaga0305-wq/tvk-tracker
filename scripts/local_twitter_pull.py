"""Run THIS FROM YOUR LAPTOP. Pulls Twitter handles via Nitter
(which works from residential IPs but is blocked from HF Spaces) and
POSTs each tweet to the backend's /api/ingest/apify-webhook endpoint
for AI extraction + DB insert.

Why this exists
---------------
HF Spaces (our backend) is blocked by every Twitter-to-RSS bridge —
nitter.net, rsshub.app, twiiit.com all 403/refuse from HF's IP range.
But your laptop's residential IP can fetch them just fine (proven via
local probes returning 200 OK with 18-20 items each).

So: laptop fetches from Nitter → POSTs to backend webhook → backend
runs the same process_article pipeline as Apify-monitored tweets.
Same trust gating, dedup, cross-reference. Same data.

When to run
-----------
  - Daily, at a convenient time, manually
  - OR add to Windows Task Scheduler / cron for every 2-4h
  - OR fire when you notice the dashboard is stale (e.g. via the
    /api/diagnostics/usage source-freshness panel)

Cost: $0. Pulls from public RSS feeds. AI extraction via Groq is free.

Usage
-----
  python scripts/local_twitter_pull.py                        # all 9 handles, last 6h
  python scripts/local_twitter_pull.py --handles sunnewstamil # specific handle
  python scripts/local_twitter_pull.py --hours 24             # wider lookback
  python scripts/local_twitter_pull.py --instance nitter.privacydev.net  # try a different mirror

Setup
-----
  Just ensure backend/.env has ADMIN_SECRET (it already does).
  No extra deps — uses urllib only.
"""
from __future__ import annotations
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

BACKEND = "https://goknaga-tvk-tracker-backend.hf.space"
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")
USER_AGENT = "Mozilla/5.0 (compatible; TVKTracker-LocalPull/1.0)"

# Same handle list as backend/app/ingestion/twitter_monitor.py HANDLES.
# Keep in sync if you add/remove monitored handles.
HANDLES: list[tuple[str, str]] = [
    # (handle, tier)
    ("CMOTamilnadu",     "govt_announcement"),
    ("TNDIPRNEWS",       "govt_announcement"),
    ("sunnewstamil",     "established_press"),
    ("News18TamilNadu",  "established_press"),
    ("SparkPluz_",       "online_native"),
    ("PttvNewsX",        "regional_press"),
    ("youturn_in",       "online_native"),
    ("DMKITwing",        "social_media"),
    ("dstock_insights",  "social_media"),
]


def _fetch_rss(url: str, timeout: int = 20) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception as e:
        return None


def _parse_nitter_rss(xml_text: str) -> list[dict]:
    items: list[dict] = []
    for m in re.finditer(r"<item\b[^>]*>(.*?)</item>", xml_text, flags=re.S | re.I):
        block = m.group(1)
        def _grab(tag: str) -> str:
            mm = re.search(rf"<{tag}\b[^>]*>(.*?)</{tag}>", block, flags=re.S | re.I)
            return (mm.group(1).strip() if mm else "")
        link = _grab("link")
        title = _grab("title")
        desc = _grab("description")
        pub_date = _grab("pubDate")
        # Decode common entities + CDATA
        for c in ("<![CDATA[", "]]>"):
            link = link.replace(c, ""); title = title.replace(c, "")
            desc = desc.replace(c, "")
        # Strip HTML tags from desc to get text
        desc = re.sub(r"<[^>]+>", " ", desc)
        desc = re.sub(r"\s+", " ", desc).strip()
        title = re.sub(r"<[^>]+>", " ", title).strip()
        # Convert pubDate to ISO
        pub_iso = ""
        try:
            pub_iso = parsedate_to_datetime(pub_date).astimezone(timezone.utc).isoformat()
        except Exception:
            pass
        # Extract image URLs from description if any
        media = re.findall(r'src="(https?://[^"]+\.(?:jpg|jpeg|png|gif|webp))"', desc, re.I)
        items.append({
            "url":          link,
            "title":        title[:200],
            "text":         desc[:5000],
            "pub_date_iso": pub_iso,
            "pub_date_raw": pub_date,
            "media_urls":   media[:3],
        })
    return items


def _post_to_webhook(items: list[dict], actor_id: str = "local_nitter_pull") -> dict:
    """Send items to the backend's /api/ingest/apify-webhook in a single batch."""
    url = f"{BACKEND}/api/ingest/apify-webhook"
    body = {
        "actorId": actor_id,
        # datasetId is required by ApifyWebhookPayload schema. We're not
        # actually an Apify run, so synthesize a stable id derived from
        # the actor + current minute (deterministic but unique per pull).
        "datasetId": f"local-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}",
        "items": items,
    }
    req = urllib.request.Request(
        url,
        method="POST",
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "x-apify-secret": ADMIN_SECRET,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"_error": True, "code": e.code, "body": e.read().decode()[:200]}
    except Exception as e:
        return {"_error": True, "msg": f"{type(e).__name__}: {str(e)[:120]}"}


def _is_recent(pub_iso: str, cutoff: datetime) -> bool:
    if not pub_iso:
        return False
    try:
        return datetime.fromisoformat(pub_iso) >= cutoff
    except Exception:
        return False


def run(handles: list[tuple[str, str]], hours: int, instance: str, dry_run: bool) -> int:
    if not ADMIN_SECRET:
        print("ERROR: ADMIN_SECRET not in backend/.env")
        return 1
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    print(f"Pulling {len(handles)} handles, lookback {hours}h, from {instance}")
    print(f"Cutoff: {cutoff.isoformat()}")
    print()

    grand_total = {"discovered": 0, "recent": 0, "queued": 0, "failed_handles": 0}
    for handle, tier in handles:
        url = f"https://{instance}/{handle}/rss"
        xml = _fetch_rss(url)
        if not xml:
            print(f"  [fail]   @{handle:18s}  (could not fetch from {instance})")
            grand_total["failed_handles"] += 1
            continue
        all_items = _parse_nitter_rss(xml)
        recent = [it for it in all_items if _is_recent(it["pub_date_iso"], cutoff)]
        grand_total["discovered"] += len(all_items)
        grand_total["recent"] += len(recent)

        # Re-shape into ApifyWebhookItem format expected by backend webhook
        webhook_items = [
            {
                "url":          it["url"],
                "title":        it["title"],
                "text":         it["text"],
                "published_at": it["pub_date_raw"],
                "source":       f"twitter_{handle}",
                "tier":         tier,
                "image_urls":   it["media_urls"],
            }
            for it in recent
        ]
        if not webhook_items:
            print(f"  [empty]  @{handle:18s}  scraped={len(all_items):2d}  recent=0")
            continue

        if dry_run:
            print(f"  [dry]    @{handle:18s}  scraped={len(all_items):2d}  recent={len(recent):2d}  (would POST)")
            continue

        resp = _post_to_webhook(webhook_items)
        if resp.get("_error"):
            print(f"  [POST!]  @{handle:18s}  recent={len(recent):2d}  -> {resp}")
        else:
            queued = resp.get("queued", len(webhook_items))
            grand_total["queued"] += queued
            print(f"  [ok]     @{handle:18s}  scraped={len(all_items):2d}  recent={len(recent):2d}  queued={queued}")

    print()
    print("==== Summary ====")
    print(f"  handles scraped:     {len(handles) - grand_total['failed_handles']} / {len(handles)}")
    print(f"  items discovered:    {grand_total['discovered']}")
    print(f"  items recent ({hours}h):  {grand_total['recent']}")
    print(f"  items queued to AI:  {grand_total['queued']}")
    print()
    print("Backend will AI-process queued items in the background (~30-60s).")
    print("Check the dashboard or /api/diagnostics/usage in a couple minutes.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--handles", type=str, default=None,
                    help="Comma-separated handles (without @). Default: all 9.")
    ap.add_argument("--hours", type=int, default=6,
                    help="Lookback window in hours (default 6)")
    ap.add_argument("--instance", type=str, default="nitter.net",
                    help="Nitter instance to pull from (default nitter.net)")
    ap.add_argument("--dry-run", action="store_true",
                    help="Show what would be POSTed without sending")
    args = ap.parse_args()
    if args.handles:
        sel = {h.strip().lstrip("@") for h in args.handles.split(",") if h.strip()}
        handles = [(h, t) for h, t in HANDLES if h in sel]
    else:
        handles = HANDLES
    sys.exit(run(handles, hours=args.hours, instance=args.instance, dry_run=args.dry_run))
