"""Economic-release watcher.

Fetches each URL in `economic_release_watches`, computes a sha256 of a
normalized version of the body (whitespace-collapsed, HTML stripped of
session-cookies and dynamic timestamps), compares to the stored
`last_hash`, and if changed:

  1. Inserts a row into `economic_release_events` with status='pending'
  2. Updates the watch row's `last_hash`, `last_checked`, `last_changed_at`
  3. Logs to stdout for the GH Action's "::notice::" summary

Idempotent — running every hour is safe.  Designed to be driven by the
weekly GitHub Action `.github/workflows/economic-release-watcher.yml`.

Requires backend/.env (or env vars) to be present with:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Usage:
    python scripts/watch_economic_releases.py
    python scripts/watch_economic_releases.py --dry-run
"""
from __future__ import annotations
import argparse
import hashlib
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import urllib.request
import urllib.error


def _load_env_file(path: Path) -> None:
    """Minimal .env loader — populates os.environ in place."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env_file(ROOT / "backend" / ".env")

from app.database import get_db  # noqa: E402


HEADERS = {
    "User-Agent": "Mozilla/5.0 (TVK-Tracker release-watcher)",
    "Accept": "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
}


def _normalize_body(body: bytes) -> str:
    """Strip dynamic noise so a hash compares only the meaningful content."""
    try:
        text = body.decode("utf-8", errors="ignore")
    except Exception:
        text = body.hex()  # binary fallback (PDFs) — hash the bytes themselves
        return text
    # Drop common "now / today / session_id / csrf_token" patterns that
    # would otherwise rotate on every fetch and cause false-positive change
    # alerts.
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = re.sub(r'csrf[_-]?token["\']\s*[:=]\s*["\'][^"\']*["\']', "", text, flags=re.I)
    text = re.sub(r'(session|nonce|request_id)["\']\s*[:=]\s*["\'][^"\']*["\']', "", text, flags=re.I)
    text = re.sub(r"\d{1,2}:\d{2}:\d{2}", "", text)            # h:m:s
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _fetch(url: str, timeout: int = 30) -> bytes | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        print(f"  [http {e.code}] {url}")
    except Exception as e:
        print(f"  [err {type(e).__name__}] {url}: {e}")
    return None


def _hash(body: bytes) -> str:
    return hashlib.sha256(_normalize_body(body).encode("utf-8")).hexdigest()[:32]


def run_once(*, dry_run: bool = False) -> dict:
    db = get_db()
    try:
        res = db.table("economic_release_watches").select("*").execute()
    except Exception as e:
        print(f"[!] Could not list watches (table missing?): {e}")
        return {"checked": 0, "changed": 0, "errors": 1}

    watches = res.data or []
    if not watches:
        print("[i] No watches configured — run migration 011.")
        return {"checked": 0, "changed": 0, "errors": 0}

    now_iso = datetime.now(timezone.utc).isoformat()
    changed = 0
    errors  = 0

    for w in watches:
        # Guard each watch independently: a flaky govt publisher page or a
        # transient DB blip must not crash the whole weekly run (that was
        # firing false "workflow failed" emails).
        try:
            url = w["url"]
            print(f"  → {w['label']}")
            body = _fetch(url)
            if body is None:
                errors += 1
                continue

            new_hash = _hash(body)
            old_hash = w.get("last_hash")
            # Be polite — 1s between requests so we don't hammer any single origin
            time.sleep(1)

            if old_hash == new_hash:
                print(f"    unchanged (hash {new_hash[:8]}…)")
                if not dry_run:
                    db.table("economic_release_watches").update(
                        {"last_checked": now_iso}
                    ).eq("id", w["id"]).execute()
                continue

            # Changed!
            print(f"    [CHANGED] {old_hash or '(first run)'} → {new_hash}")
            changed += 1
            if dry_run:
                continue

            # Skip event emission on first-ever observation (we don't yet have a
            # baseline to compare against).
            emit_event = old_hash is not None
            db.table("economic_release_watches").update({
                "last_hash":       new_hash,
                "last_checked":    now_iso,
                "last_changed_at": now_iso,
            }).eq("id", w["id"]).execute()

            if emit_event:
                db.table("economic_release_events").insert({
                    "watch_id":   w["id"],
                    "old_hash":   old_hash,
                    "new_hash":   new_hash,
                    "status":     "pending",
                }).execute()
        except Exception as e:
            errors += 1
            print(f"    [skip] {w.get('label')}: {type(e).__name__}: {str(e)[:120]}")
            continue

    summary = {
        "checked":     len(watches),
        "changed":     changed,
        "errors":      errors,
        "completed_at": now_iso,
    }
    print(f"\n[done] checked={summary['checked']} changed={summary['changed']} errors={summary['errors']}")
    return summary


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="Don't write to DB; just print what would change")
    args = ap.parse_args()
    out = run_once(dry_run=args.dry_run)
    # Only FAIL the workflow on a CATASTROPHIC run (every watch errored —
    # i.e. a systemic problem like no network or DB down). A few flaky govt
    # publisher pages (DPIIT, MoSPI are routinely slow/down) are normal and
    # must NOT page the maintainer — those URLs just retry next week.
    total = out.get("checked", 0)
    catastrophic = total > 0 and out["errors"] >= total
    sys.exit(2 if catastrophic else 0)
