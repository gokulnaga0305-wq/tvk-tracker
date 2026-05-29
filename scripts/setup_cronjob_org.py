"""Create all 6 cron-job.org jobs in one shot via their REST API.

User asked me to set them up directly instead of clicking through the
cron-job.org UI 6 times. This does the equivalent in one script run,
using cron-job.org's documented REST API.

Prerequisites
-------------
1. Sign in to https://cron-job.org/en/
2. Click your avatar (top right) → "API"
3. Click "Create API key"
4. Copy the key
5. Export it locally before running this script:
       PowerShell:  $env:CRONJOB_API_KEY = "PASTE_KEY_HERE"
       bash/zsh:    export CRONJOB_API_KEY="PASTE_KEY_HERE"
6. Make sure backend/.env has the CURRENT ADMIN_SECRET value (the one
   that matches what's on HF Spaces). The script reads it from there.
7. Run:  python scripts/setup_cronjob_org.py
8. Optional: after the script reports success, unset the env var so the
   API key doesn't linger in your shell history.

What this creates
-----------------
Six jobs hitting the new /api/cron/* router on the HF Space:
  1. TVK · keep HF warm        GET   every 5 min   no auth
  2. TVK · monitor handles     POST  every 1 hour  x-admin-secret
  3. TVK · trickle verify      POST  every 30 min  x-admin-secret
  4. TVK · nightly full sweep  POST  daily 22:00 UTC  x-admin-secret
  5. TVK · meter snapshot      POST  daily 18:00 UTC  x-admin-secret
  6. TVK · promise audit       POST  daily 18:30 UTC  x-admin-secret

Idempotent: if a job with the same title already exists the script
patches it instead of creating a duplicate.

cron-job.org API reference: https://docs.cron-job.org/rest-api.html
"""
from __future__ import annotations
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load_env():
    p = ROOT / "backend" / ".env"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()

API = "https://api.cron-job.org"
BACKEND = "https://goknaga-tvk-tracker-backend.hf.space"

API_KEY = os.environ.get("CRONJOB_API_KEY", "").strip()
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "").strip()

if not API_KEY:
    print("ERROR: CRONJOB_API_KEY env var is not set. See the docstring at the top of this file.")
    sys.exit(1)
if not ADMIN_SECRET:
    print("ERROR: ADMIN_SECRET could not be read from backend/.env. Update the .env file so it matches HF Spaces.")
    sys.exit(1)


# cron-job.org request_method codes (from their API docs)
METHOD_GET = 0
METHOD_POST = 1


def _make_schedule(*, minutes=None, hours=None, mdays=None, months=None, wdays=None):
    """cron-job.org represents schedules as arrays of integers per field.
    -1 in a field means 'every value'.

    Timezone is Asia/Kolkata (IST) so the user reads schedules in their
    local clock. The wall-clock firing times below were chosen for the
    Tamil press cycle (overnight batch jobs avoid peak tweet hours).
    """
    return {
        "timezone": "Asia/Kolkata",
        "expiresAt": 0,
        "hours": hours if hours is not None else [-1],
        "mdays": mdays if mdays is not None else [-1],
        "minutes": minutes if minutes is not None else [-1],
        "months": months if months is not None else [-1],
        "wdays": wdays if wdays is not None else [-1],
    }


# Map of (title -> job spec)
JOBS = [
    {
        "title":          "TVK · keep HF warm",
        "url":            f"{BACKEND}/api/cron/keep-warm",
        "requestMethod":  METHOD_GET,
        # Every 5 minutes
        "schedule":       _make_schedule(minutes=[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]),
        "headers":        {},
    },
    {
        "title":          "TVK · monitor handles",
        "url":            f"{BACKEND}/api/cron/monitor-handles?hours_back=2&max_per_handle=30",
        "requestMethod":  METHOD_POST,
        # Every 1 hour at :00 — right-sized for an accountability
        # dashboard (not a news ticker). 2h lookback handles handles
        # that tweet in bursts; 30 max/handle prevents runaway AI
        # spend on the rare high-volume hour.
        # Was 15 min × 9 handles × ~10 tweets = ~$3.50/day in Haiku.
        # Now 1h × Groq free tier = ~$0/day.
        "schedule":       _make_schedule(minutes=[0]),
        "headers":        {"x-admin-secret": ADMIN_SECRET},
    },
    {
        "title":          "TVK · nightly handles catchup",
        "url":            f"{BACKEND}/api/cron/monitor-handles?hours_back=24&max_per_handle=200",
        "requestMethod":  METHOD_POST,
        # Daily 04:00 IST — full 24h re-scrape of every handle. Catches
        # anything the 15-min jobs missed (rate-limited Apify runs,
        # transient errors, tweets posted between two ticks and deleted
        # before next, etc). Insurance policy on completeness.
        "schedule":       _make_schedule(hours=[4], minutes=[0]),
        "headers":        {"x-admin-secret": ADMIN_SECRET},
    },
    {
        "title":          "TVK · trickle verify",
        "url":            f"{BACKEND}/api/cron/sweep-verify?limit=10&max_age_days=45",
        "requestMethod":  METHOD_POST,
        # Every 30 minutes
        "schedule":       _make_schedule(minutes=[0, 30]),
        "headers":        {"x-admin-secret": ADMIN_SECRET},
    },
    {
        "title":          "TVK · nightly full sweep",
        "url":            f"{BACKEND}/api/cron/sweep-verify?limit=500&max_age_days=45",
        "requestMethod":  METHOD_POST,
        # Daily 03:30 IST — overnight backlog re-check at low-traffic hour
        "schedule":       _make_schedule(hours=[3], minutes=[30]),
        "headers":        {"x-admin-secret": ADMIN_SECRET},
    },
    {
        "title":          "TVK · meter snapshot",
        "url":            f"{BACKEND}/api/cron/meter-snapshot",
        "requestMethod":  METHOD_POST,
        # Daily 23:30 IST — late-night snapshot captures the full day's signal
        "schedule":       _make_schedule(hours=[23], minutes=[30]),
        "headers":        {"x-admin-secret": ADMIN_SECRET},
    },
    {
        "title":          "TVK · promise audit",
        "url":            f"{BACKEND}/api/cron/promise-audit",
        "requestMethod":  METHOD_POST,
        # Daily 00:00 IST — midnight rollover, checks deadline-passed promises
        "schedule":       _make_schedule(hours=[0], minutes=[0]),
        "headers":        {"x-admin-secret": ADMIN_SECRET},
    },
    {
        "title":          "TVK · weekly fact-check scrape",
        "url":            f"{BACKEND}/api/cron/scrape-factcheckers?max_per_source=10",
        "requestMethod":  METHOD_POST,
        # Sundays 04:30 IST — sweep NewsMeter + YouTurn fact-check tag
        # pages, AI-extract post-May-11 TVK/Vijay debunks, queue as
        # propaganda_events (status='active'). Weekly cadence keeps the
        # AI cost bounded (~$0.03/run).
        "schedule":       _make_schedule(hours=[4], minutes=[30], wdays=[0]),
        "headers":        {"x-admin-secret": ADMIN_SECRET},
    },
]


def _api(method: str, path: str, body: dict | None = None) -> dict:
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        method=method,
        data=data,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        raise RuntimeError(f"HTTP {e.code} {e.reason} on {method} {path}: {raw[:200]}")


def _list_jobs() -> list[dict]:
    res = _api("GET", "/jobs")
    return res.get("jobs", []) or []


def _build_job_payload(spec: dict) -> dict:
    extended_data = {"headers": spec["headers"], "body": ""}
    return {
        "job": {
            "enabled":       True,
            "title":         spec["title"],
            "url":           spec["url"],
            "saveResponses": True,
            "requestMethod": spec["requestMethod"],
            "schedule":      spec["schedule"],
            "extendedData":  extended_data,
            "requestTimeout": 60,  # seconds — cron-job.org max is 60s
            "redirectSuccess": False,
            "notification": {
                "onFailure": True,
                "onSuccess": False,
                "onDisable": True,
            },
        }
    }


def main() -> int:
    print(f"[i] Backend target: {BACKEND}")
    print(f"[i] Loading existing cron-job.org jobs...")
    try:
        existing = _list_jobs()
    except Exception as e:
        print(f"FATAL: Could not list jobs ({e}). Check that CRONJOB_API_KEY is valid.")
        return 1
    by_title = {j.get("title"): j for j in existing}
    print(f"[i] {len(existing)} job(s) already exist on this account")

    successes = 0
    for spec in JOBS:
        title = spec["title"]
        payload = _build_job_payload(spec)
        try:
            if title in by_title:
                job_id = by_title[title]["jobId"]
                _api("PATCH", f"/jobs/{job_id}", payload)
                print(f"  [up] {title:32s} (id={job_id})")
            else:
                res = _api("PUT", "/jobs", payload)
                job_id = res.get("jobId")
                print(f"  [new] {title:32s} (id={job_id})")
            successes += 1
        except Exception as e:
            print(f"  [err] {title:32s} -> {e}")

    print()
    print(f"==== Summary: {successes}/{len(JOBS)} jobs configured ====")
    if successes == len(JOBS):
        print()
        print("All 6 jobs are now live on cron-job.org.")
        print("Watch the dashboard's 'Tracking N incidents' counter over the next 1-2h")
        print("to confirm fresh tweets are landing via /api/cron/monitor-handles.")
    return 0 if successes == len(JOBS) else 2


if __name__ == "__main__":
    sys.exit(main())
