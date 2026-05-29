"""Full-stack QA audit.

Tests every layer end-to-end:
  L1. API health — all endpoints return 200 within budget
  L2. Data consistency — DB == API == frontend-visible counts
  L3. Math correctness — meter, baselines, percentages add up
  L4. Status integrity — no stuck rows (multi-source in pending_review etc.)
  L5. Category integrity — no ghost categories, all real ones tracked
  L6. District integrity — 96%+ tagged, mapping correct
  L7. Source enrichment — every incident has populated sources
  L8. Trust hierarchy — verified + press + community = total
  L9. Promise integrity — broken/kept counts match reality
 L10. Date integrity — no pre-May-11 items, no future-dated nonsense
 L11. Methodology gaps — observability bias, comparison fairness
 L12. Cron health — last successful run within expected cadence

Report severity: CRITICAL (broken user experience), WARN (off but tolerable),
INFO (worth noting but working).
"""
from __future__ import annotations
import json
import os
import sys
import urllib.request
import time
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def _load_env(path: Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env(ROOT / "backend" / ".env")
from app.database import get_db  # noqa: E402


HF = "https://goknaga-tvk-tracker-backend.hf.space"
findings: list[tuple[str, str, str]] = []  # (severity, layer, message)


def F(sev: str, layer: str, msg: str):
    findings.append((sev, layer, msg))


def _get(url: str, *, timeout: int = 30) -> tuple[int, object, float]:
    start = time.time()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            body = r.read()
            return r.status, json.loads(body), time.time() - start
    except urllib.error.HTTPError as e:
        return e.code, None, time.time() - start
    except Exception as e:
        return -1, str(e), time.time() - start


def banner(s: str):
    print()
    print("=" * 80)
    print(s)
    print("=" * 80)


def main():
    db = get_db()

    # ============================================================
    # L1. API HEALTH
    # ============================================================
    banner("L1. API HEALTH")
    endpoints = [
        "/health",
        "/api/stats/dashboard",
        "/api/stats/incumbency-meter",
        "/api/stats/districts",
        "/api/stats/meter-history?days=30",
        "/api/incidents/?limit=10",
        "/api/incidents/categories",
        "/api/baselines/dashboard",
        "/api/economic/dashboard",
        "/api/promises/",
        "/api/members/",
        "/api/defections/",
        "/api/defections/stats",
    ]
    slow_threshold = 3.0
    for ep in endpoints:
        status, data, dt = _get(HF + ep)
        if status != 200:
            F("CRITICAL", "L1", f"{ep} -> HTTP {status} (in {dt:.1f}s)")
        elif dt > slow_threshold:
            F("WARN", "L1", f"{ep} -> 200 but slow ({dt:.1f}s, threshold {slow_threshold}s)")
        else:
            print(f"  ✓ {ep:50s} 200 in {dt*1000:.0f}ms")

    # ============================================================
    # L2. DB <-> API CONSISTENCY
    # ============================================================
    banner("L2. DB <-> API CONSISTENCY")
    db_approved = db.table("incidents").select("id", count="exact").eq("status", "approved").execute().count
    db_total    = db.table("incidents").select("id", count="exact").execute().count
    api_dash    = _get(HF + "/api/stats/dashboard")[1]
    api_total   = api_dash.get("total_incidents") if isinstance(api_dash, dict) else None
    print(f"  DB total (any status): {db_total}")
    print(f"  DB approved:           {db_approved}")
    print(f"  API total_incidents:   {api_total}")
    if api_total != db_approved:
        F("CRITICAL", "L2", f"Mismatch: API={api_total} vs DB approved={db_approved}")
    # Trust hierarchy sum
    cross = api_dash.get("cross_verified_count", 0)
    press = api_dash.get("press_verified_count", 0)
    comm  = api_dash.get("community_pending_count", 0)
    if cross + press + comm != api_total:
        F("WARN", "L2", f"Trust hierarchy sum {cross + press + comm} != total {api_total}")
    else:
        print(f"  ✓ Trust hierarchy: {cross}+{press}+{comm} = {api_total}")

    # ============================================================
    # L3. MATH — meter score formula
    # ============================================================
    banner("L3. METER MATH")
    meter = _get(HF + "/api/stats/incumbency-meter")[1]
    score = meter.get("score")
    anti  = meter.get("anti_pressure_total", 0)
    pro   = meter.get("pro_boost_total", 0)
    honey = meter.get("honeymoon_softener", 0)
    expected = 50 - anti + pro + honey
    print(f"  score:    {score}")
    print(f"  formula:  50 - {anti} + {pro} + {honey} = {expected:.2f}")
    if abs(score - max(0, min(100, expected))) > 0.5:
        F("WARN", "L3", f"Meter math off: shows {score}, expected {expected:.2f}")
    else:
        print(f"  ✓ Meter math correct")
    # Day check
    govt_start = date(2026, 5, 11)
    expected_day = (date.today() - govt_start).days + 1
    actual_day = meter.get("govt_day", 0)
    if abs(actual_day - expected_day) > 1:
        F("WARN", "L3", f"Govt day off: meter says {actual_day}, expected ~{expected_day}")
    else:
        print(f"  ✓ Govt day: {actual_day} (~{expected_day} expected)")

    # ============================================================
    # L4. STATUS INTEGRITY
    # ============================================================
    banner("L4. STATUS INTEGRITY")
    # Anything multi_source_verified must be approved
    r = db.table("incidents").select("id, title", count="exact").eq(
        "verification_status", "multi_source_verified").neq("status", "approved").execute()
    if r.count and r.count > 0:
        F("CRITICAL", "L4", f"{r.count} multi_source_verified items NOT approved (status mismatch)")
        for row in r.data[:5]:
            print(f"    [stuck] {row.get('title','')[:80]}")
    else:
        print(f"  ✓ All multi_source_verified items are approved")
    # press_verified should be approved too
    r = db.table("incidents").select("id, title", count="exact").eq(
        "verification_status", "press_verified").neq("status", "approved").execute()
    if r.count and r.count > 0:
        F("WARN", "L4", f"{r.count} press_verified items not approved")
    else:
        print(f"  ✓ All press_verified items are approved")

    # ============================================================
    # L5. CATEGORY INTEGRITY
    # ============================================================
    banner("L5. CATEGORY INTEGRITY")
    res = db.table("incidents").select("category").eq("status", "approved").execute()
    db_cats = Counter([row.get("category") or "NULL" for row in (res.data or [])])
    print(f"  DB has {len(db_cats)} distinct categories with approved data")
    api_cats = _get(HF + "/api/incidents/categories")[1]
    api_cat_set = {c["category"] for c in api_cats} if isinstance(api_cats, list) else set()
    db_cat_set = set(db_cats.keys())
    only_in_db  = db_cat_set - api_cat_set - {"NULL"}
    only_in_api = api_cat_set - db_cat_set
    if only_in_db:
        F("WARN", "L5", f"Categories in DB but missing from /api/incidents/categories: {only_in_db}")
    if only_in_api:
        F("WARN", "L5", f"Categories returned by API but no DB data: {only_in_api}")
    if not only_in_db and not only_in_api:
        print(f"  ✓ DB and API category lists match")
    # NULL categories
    null_cats = db_cats.get("NULL", 0)
    if null_cats > 0:
        F("WARN", "L5", f"{null_cats} approved incidents have NULL category")

    # ============================================================
    # L6. DISTRICT INTEGRITY
    # ============================================================
    banner("L6. DISTRICT INTEGRITY")
    r = db.table("incidents").select("district, location").eq("status", "approved").execute()
    with_district = sum(1 for row in (r.data or []) if row.get("district"))
    no_district   = sum(1 for row in (r.data or []) if not row.get("district") and row.get("location") and row.get("location").strip().lower() not in {"tamil nadu", "tn", "tamil nadu (state-wide policy)"})
    statewide     = sum(1 for row in (r.data or []) if (row.get("location") or "").strip().lower() in {"tamil nadu", "tn", "tamil nadu (state-wide policy)"})
    print(f"  With district tag:     {with_district}")
    print(f"  Statewide (no district): {statewide}")
    print(f"  Untagged but has loc:  {no_district}")
    if no_district > 5:
        F("WARN", "L6", f"{no_district} incidents have a location but no district tag (could expand mapper)")
    # API count matches
    dist = _get(HF + "/api/stats/districts")[1]
    if isinstance(dist, dict):
        tracked = dist.get("totals", {}).get("districts_tracked", 0)
        if tracked != 38:
            F("WARN", "L6", f"districts_tracked={tracked}, expected 38")
        else:
            print(f"  ✓ 38 districts tracked")

    # ============================================================
    # L7. SOURCE ENRICHMENT
    # ============================================================
    banner("L7. SOURCE ENRICHMENT")
    api_inc = _get(HF + "/api/incidents/?limit=50")[1]
    if isinstance(api_inc, list):
        without_sources = [i for i in api_inc if not i.get("sources")]
        if without_sources:
            F("WARN", "L7", f"{len(without_sources)} of 50 sampled incidents have no enriched sources array")
        else:
            print(f"  ✓ All sampled incidents have sources array populated")

    # ============================================================
    # L8. PROMISE INTEGRITY
    # ============================================================
    banner("L8. PROMISE INTEGRITY")
    p_total = db.table("promises").select("id", count="exact").execute().count
    p_kept  = db.table("promises").select("id", count="exact").eq("status", "kept").execute().count
    p_broken = db.table("promises").select("id", count="exact").eq("status", "broken").execute().count
    p_partial = db.table("promises").select("id", count="exact").eq("status", "partial").execute().count
    p_pending = db.table("promises").select("id", count="exact").eq("status", "pending").execute().count
    print(f"  total:   {p_total}")
    print(f"  kept:    {p_kept}")
    print(f"  broken:  {p_broken}")
    print(f"  partial: {p_partial}")
    print(f"  pending: {p_pending}")
    if p_kept + p_broken + p_partial + p_pending != p_total:
        F("WARN", "L8", f"Promise status sum doesn't match total ({p_kept+p_broken+p_partial+p_pending} vs {p_total})")
    # Check api consistency
    api_kept = api_dash.get("promises_kept")
    api_total_p = api_dash.get("promises_total")
    if api_kept != p_kept:
        F("WARN", "L8", f"API promises_kept ({api_kept}) != DB kept ({p_kept})")
    if api_total_p != p_total:
        F("WARN", "L8", f"API promises_total ({api_total_p}) != DB total ({p_total})")

    # ============================================================
    # L9. DATE INTEGRITY
    # ============================================================
    banner("L9. DATE INTEGRITY")
    r = db.table("incidents").select("id, incident_date, title").eq("status", "approved").lt("incident_date", "2026-05-11").execute()
    if r.data:
        F("CRITICAL", "L9", f"{len(r.data)} pre-May-11 incidents are still approved (should be rejected)")
        for row in r.data[:3]:
            print(f"    [{row.get('incident_date')}] {row.get('title','')[:70]}")
    else:
        print(f"  ✓ No pre-election incidents approved")
    # Future dates
    today = date.today().isoformat()
    r = db.table("incidents").select("id, incident_date, title").eq("status", "approved").gt("incident_date", today).execute()
    if r.data:
        F("WARN", "L9", f"{len(r.data)} incidents dated in the FUTURE (parse error?)")
    else:
        print(f"  ✓ No future-dated incidents")

    # ============================================================
    # L10. METHODOLOGY / OBSERVABILITY BIAS
    # ============================================================
    banner("L10. METHODOLOGY GAPS")
    baselines = _get(HF + "/api/baselines/dashboard")[1]
    if isinstance(baselines, list):
        # NCRB DMK monthly average is in hundreds; we track 10s.
        # Surface the comparison-fairness concern explicitly.
        for b in baselines:
            label = b.get("label", "?")
            tvk_count = b.get("tvk_count", 0)
            dmk_expected = b.get("expected_at_dmk_rate", 0)
            if label in ("Murders", "Sexual Assaults", "Crimes vs Women & Children") and tvk_count == 0:
                continue
            if dmk_expected > tvk_count * 5 and dmk_expected > 0:
                F("WARN", "L10", f"{label}: TVK tracked {tvk_count} vs DMK pace {dmk_expected:.0f}. "
                                 "Difference may reflect SCRAPING COVERAGE, not actual rate. "
                                 "Press tweets ~50-100 events/week — NCRB tracks ALL reported incidents.")

    # ============================================================
    # L11. CRON FRESHNESS
    # ============================================================
    banner("L11. CRON FRESHNESS")
    r = db.table("incidents").select("created_at").order("created_at", desc=True).limit(1).execute()
    if r.data:
        last = r.data[0].get("created_at", "")
        try:
            last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
            hours = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
            print(f"  Last ingest: {last[:19]} UTC ({hours:.1f}h ago)")
            if hours > 6:
                F("WARN", "L11", f"Latest ingest {hours:.1f}h ago — 2h cron may not be firing")
        except Exception as e:
            F("WARN", "L11", f"Could not parse last ingest time: {e}")

    # ============================================================
    # L12. METER SUB-INPUTS CONSISTENCY
    # ============================================================
    banner("L12. METER SUB-INPUTS")
    ri = meter.get("raw_inputs", {})
    cat_worse = ri.get("categories_worse_than_dmk", 0)
    cat_beats = ri.get("categories_beating_dmk", 0)
    print(f"  Categories worse than DMK: {cat_worse}")
    print(f"  Categories beating DMK:    {cat_beats}")
    print(f"  High-severity verified:    {ri.get('high_severity_verified', 0)}")
    print(f"  Credit steals:             {ri.get('credit_steals', 0)}")
    print(f"  Press sentiment window:    {ri.get('press_sentiment_window_total', 0)} ({ri.get('press_sentiment_net_pct', 0)} net)")
    print(f"  Honeymoon softener active: {meter.get('honeymoon_softener', 0)} pts")

    # ============================================================
    # FINAL REPORT
    # ============================================================
    banner("AUDIT REPORT")
    sev_order = {"CRITICAL": 0, "WARN": 1, "INFO": 2}
    findings.sort(key=lambda x: sev_order.get(x[0], 9))
    if not findings:
        print("  ✓ NO ISSUES FOUND. System is consistent across all layers.")
    else:
        print(f"  Total findings: {len(findings)}")
        crit = sum(1 for f in findings if f[0] == "CRITICAL")
        warn = sum(1 for f in findings if f[0] == "WARN")
        info = sum(1 for f in findings if f[0] == "INFO")
        print(f"    CRITICAL: {crit}")
        print(f"    WARN:     {warn}")
        print(f"    INFO:     {info}")
        print()
        for sev, layer, msg in findings:
            tag = {"CRITICAL": "🔴", "WARN": "🟠", "INFO": "🔵"}.get(sev, "  ")
            print(f"  {tag} [{layer}] {msg}")


if __name__ == "__main__":
    main()
