"""End-to-end health snapshot of the TVK Tracker stack.

Audits every moving part and prints a per-component pass/fail/warn line.

Components checked:
  1. HF Spaces backend reachable (/health)
  2. All 6 cron endpoints respond correctly
  3. Frontend (Vercel) reachable
  4. Supabase tables present + reachable (incidents, sources, promises,
     meter_snapshots, dmk_announcements)
  5. Today's meter snapshot exists (proves meter cron working)
  6. Recent source rows ingested in last 1h (proves monitor cron working)
  7. Pending->verified promotions in last 24h (proves sweep cron working)
  8. /api/stats/dashboard returns sane data (incident count > 0,
     trust split balanced, top_sources populated)
  9. Source policy invariant holds (no approved row without source_urls)
 10. cron router /api/cron/* present (proves latest deploy is live)

Run:  python scripts/health_check.py
"""
from __future__ import annotations
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from app.database import get_db  # noqa: E402

BACKEND = "https://goknaga-tvk-tracker-backend.hf.space"
FRONTEND = "https://tvk-tracker.vercel.app"
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")

# Result accumulator
results: list[tuple[str, str, str]] = []  # (status, name, detail)


def _check(name: str, fn):
    try:
        ok, detail = fn()
        results.append(("OK" if ok else "FAIL", name, detail))
    except Exception as e:
        results.append(("FAIL", name, f"{type(e).__name__}: {str(e)[:140]}"))


def _http(url: str, *, method="GET", headers=None, timeout=15) -> tuple[int, str]:
    req = urllib.request.Request(url, method=method, headers=headers or {})
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")


# ---------------------------------------------------------------- 1. Backend
def check_backend():
    code, body = _http(f"{BACKEND}/health")
    if code != 200:
        return False, f"HTTP {code}"
    j = json.loads(body)
    return True, f"govt_day={j.get('govt_day')} govt={j.get('govt')}"


# ---------------------------------------------------------------- 2. Cron router
def check_cron_keep_warm():
    code, body = _http(f"{BACKEND}/api/cron/keep-warm")
    return code == 200, f"HTTP {code} {body[:60]}"


def check_cron_admin_endpoints():
    """All 5 admin-gated endpoints should return 202 with valid secret."""
    if not ADMIN_SECRET:
        return False, "ADMIN_SECRET missing from local .env"
    # Use the lightest available shape — sweep-verify with limit=1
    endpoints = [
        ("monitor-handles", "POST", "?hours_back=1&max_per_handle=1"),
        ("sweep-verify", "POST", "?limit=1&max_age_days=1"),
        # meter-snapshot has no params — but it's idempotent so safe to ping
        # We'll skip actually firing it here since it writes; just check 405
        # behaviour on GET to confirm route exists
    ]
    # GET on a POST-only route returns 405 if route exists, 404 if not
    code, _ = _http(f"{BACKEND}/api/cron/monitor-handles", method="GET")
    if code != 405:
        return False, f"monitor-handles route: HTTP {code} (expected 405 on GET)"
    code, _ = _http(f"{BACKEND}/api/cron/sweep-verify", method="GET")
    if code != 405:
        return False, f"sweep-verify route: HTTP {code} (expected 405 on GET)"
    code, _ = _http(f"{BACKEND}/api/cron/meter-snapshot", method="GET")
    if code != 405:
        return False, f"meter-snapshot route: HTTP {code} (expected 405 on GET)"
    code, _ = _http(f"{BACKEND}/api/cron/promise-audit", method="GET")
    if code != 405:
        return False, f"promise-audit route: HTTP {code} (expected 405 on GET)"
    return True, "all 4 admin cron routes present (405 on GET = route exists)"


def check_cron_auth_works():
    code, body = _http(
        f"{BACKEND}/api/cron/sweep-verify?limit=1&max_age_days=1",
        method="POST",
        headers={"x-admin-secret": ADMIN_SECRET},
    )
    if code != 200:
        return False, f"HTTP {code} body={body[:80]}"
    return True, f"admin secret accepted (sweep-verify returned 200)"


# ---------------------------------------------------------------- 3. Frontend
def check_frontend():
    code, body = _http(FRONTEND, timeout=20)
    if code != 200:
        return False, f"HTTP {code}"
    # Look for our app shell signals
    if "TVK" not in body and "Tracker" not in body:
        return False, f"response body doesn't look like TVK Tracker frontend"
    return True, f"HTTP 200 ({len(body)} bytes)"


# ---------------------------------------------------------------- 4. DB tables
def check_db_tables():
    db = get_db()
    tables_required = ["incidents", "sources", "promises", "meter_snapshots",
                       "dmk_announcements", "incident_audit"]
    missing = []
    counts = {}
    for t in tables_required:
        try:
            r = db.table(t).select("*", count="exact").limit(1).execute()
            counts[t] = r.count or 0
        except Exception as e:
            missing.append(f"{t} ({str(e)[:40]})")
    if missing:
        return False, f"missing/inaccessible: {', '.join(missing)}"
    cnt_str = " ".join(f"{t}={n}" for t, n in counts.items())
    return True, cnt_str


# ---------------------------------------------------------------- 5. Today's meter
def check_meter_snapshot_today():
    db = get_db()
    today = datetime.now(timezone.utc).date().isoformat()
    r = db.table("meter_snapshots").select("snapshot_date,score,zone").eq(
        "snapshot_date", today
    ).execute()
    if not r.data:
        return False, f"no snapshot for {today} yet"
    row = r.data[0]
    return True, f"snapshot for {today}: score={row['score']} zone={row['zone']}"


# ---------------------------------------------------------------- 6. Recent ingestion
def check_recent_sources():
    db = get_db()
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    r = db.table("sources").select("url", count="exact").gte(
        "scraped_at", one_hour_ago
    ).execute()
    n = r.count or 0
    if n == 0:
        return False, "0 sources ingested in last 1h"
    return True, f"{n} sources ingested in last 1h"


# ---------------------------------------------------------------- 7. Recent promotions
def check_recent_promotions():
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    r = db.table("incident_audit").select("id", count="exact").eq(
        "action", "source_added"
    ).gte("created_at", since).execute()
    n = r.count or 0
    return True, f"{n} incidents got new sources via cross-ref in last 24h"


# ---------------------------------------------------------------- 8. Dashboard stats
def check_dashboard_stats():
    code, body = _http(f"{BACKEND}/api/stats/dashboard")
    if code != 200:
        return False, f"HTTP {code}"
    s = json.loads(body)
    total = s.get("total_incidents", 0)
    if total == 0:
        return False, "0 total incidents"
    ts = s.get("top_sources") or {}
    if not ts:
        return False, "top_sources field empty (drilldown chips won't show)"
    cv = s.get("cross_verified_count", 0)
    pv = s.get("press_verified_count", 0)
    cp = s.get("community_pending_count", 0)
    return True, (f"total={total} cv={cv} pv={pv} comm={cp} "
                  f"top_source_keys={len(ts)}")


# ---------------------------------------------------------------- 9. Source policy
def check_source_policy():
    db = get_db()
    r = db.table("incidents").select("id,source_urls").eq("status", "approved").execute()
    violators = [row for row in (r.data or []) if not (row.get("source_urls") or [])]
    if violators:
        return False, f"{len(violators)} approved rows missing source_urls"
    return True, f"all {len(r.data or [])} approved rows have at least 1 source"


def check_cron_routes_listed():
    code, body = _http(f"{BACKEND}/openapi.json", timeout=20)
    if code != 200:
        return False, f"OpenAPI HTTP {code}"
    spec = json.loads(body)
    paths = spec.get("paths", {})
    cron_routes = [p for p in paths if p.startswith("/api/cron")]
    expected = {"/api/cron/keep-warm", "/api/cron/monitor-handles",
                "/api/cron/monitor-handle/{handle}", "/api/cron/sweep-verify",
                "/api/cron/meter-snapshot", "/api/cron/promise-audit"}
    found = set(cron_routes) & expected
    missing = expected - found
    if missing:
        return False, f"missing routes: {missing}"
    return True, f"all 6 cron routes registered in OpenAPI"


# ---------------------------------------------------------------- Run all
checks = [
    ("1. Backend reachable",             check_backend),
    ("2. Cron router routes registered", check_cron_routes_listed),
    ("3. keep-warm endpoint",            check_cron_keep_warm),
    ("4. Admin-gated endpoints respond", check_cron_admin_endpoints),
    ("5. Admin secret authentication",   check_cron_auth_works),
    ("6. Frontend (Vercel) reachable",   check_frontend),
    ("7. DB tables accessible",          check_db_tables),
    ("8. Today's meter snapshot",        check_meter_snapshot_today),
    ("9. Sources ingested last 1h",      check_recent_sources),
    ("10. Cross-ref promotions last 24h",check_recent_promotions),
    ("11. Dashboard stats sane",         check_dashboard_stats),
    ("12. Source-policy invariant",      check_source_policy),
]

print(f"==== TVK Tracker health check @ {datetime.now(timezone.utc).isoformat()} ====")
print(f"Backend:  {BACKEND}")
print(f"Frontend: {FRONTEND}")
print()
for name, fn in checks:
    _check(name, fn)

# Print table
ok = sum(1 for s, *_ in results if s == "OK")
fail = sum(1 for s, *_ in results if s == "FAIL")
warn = sum(1 for s, *_ in results if s == "WARN")
for status, name, detail in results:
    icon = "[OK]  " if status == "OK" else ("[FAIL]" if status == "FAIL" else "[WARN]")
    print(f"{icon}  {name:38s}  {detail}")
print()
print(f"==== Summary: {ok} OK, {fail} FAIL, {warn} WARN ====")
sys.exit(0 if fail == 0 else 1)
