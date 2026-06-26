"""Repair YouTurn evidence URLs: insert the missing /factcheck/ route segment.

The GraphQL ingester built debunk_url as https://youturn.in/<slug>, but YouTurn's
SPA serves a fact-check at https://youturn.in/factcheck/<slug> — the bare slug
404s. This rewrites stored propaganda_events URLs (debunk_url + source_urls) in
place. Idempotent: skips any URL that already has /factcheck/ or /articles/.
Re-run scripts/sync_fact_checks.py afterwards to propagate into fact_checks.
"""
from __future__ import annotations
import os, sys
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("="); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
from app.database import get_db  # noqa: E402

_BASE = "https://youturn.in/"


def _fix(url: str) -> str:
    if not url or not url.startswith(_BASE):
        return url
    rest = url[len(_BASE):]
    if rest.startswith(("factcheck/", "articles/", "article/")):
        return url  # already routed
    return f"{_BASE}factcheck/{rest}"


def run() -> int:
    db = get_db()
    rows = (db.table("propaganda_events").select("id,debunk_url,source_urls")
            .ilike("debunk_url", "%youturn.in%").execute().data or [])
    fixed = 0
    for r in rows:
        old = r.get("debunk_url") or ""
        new = _fix(old)
        new_srcs = [_fix(u) for u in (r.get("source_urls") or [])]
        if new != old or new_srcs != (r.get("source_urls") or []):
            db.table("propaganda_events").update(
                {"debunk_url": new, "source_urls": new_srcs}).eq("id", r["id"]).execute()
            fixed += 1
    print(f"==== fixed {fixed} of {len(rows)} YouTurn rows ====")
    # show a couple for sanity
    for r in (db.table("propaganda_events").select("debunk_url")
              .ilike("debunk_url", "%youturn.in%").limit(3).execute().data or []):
        print("  ", r["debunk_url"])
    return 0


if __name__ == "__main__":
    sys.exit(run())
