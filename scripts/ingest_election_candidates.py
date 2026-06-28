"""Ingest 2026 TN candidate profiles (P1.5, OBSERVED).

Source: tnelections2026.in candidates bundle (affidavit-derived: party, gender,
age, education, declared assets, criminal-case flag, result). Run AFTER applying
database/027_election_candidates.sql. Idempotent (upsert on ac_no+sl_no+name).

    python scripts/ingest_election_candidates.py
"""
from __future__ import annotations
import os, sys, re, json, urllib.request
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("="); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
from app.database import get_db  # noqa: E402

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"
_SRC = "https://tnelections2026.in/data/candidates_bundle.min.js"


def _parse_assets(text: str):
    """'₹7.57 Cr' -> 7.57 ; '₹85.0 Lac' -> 0.85 ; 'Nil'/'' -> None."""
    if not text:
        return None
    m = re.search(r"([\d,]+\.?\d*)\s*(Cr|Crore|Lac|Lakh|Thou|Hund)?", text, re.I)
    if not m:
        return None
    try:
        val = float(m.group(1).replace(",", ""))
    except ValueError:
        return None
    unit = (m.group(2) or "Cr").lower()
    if unit.startswith(("lac", "lakh")):
        val /= 100.0
    elif unit.startswith("thou"):
        val /= 1e5
    elif unit.startswith("hund"):
        val /= 1e7
    return round(val, 3)


def run() -> int:
    db = get_db()
    req = urllib.request.Request(_SRC, headers={"User-Agent": _UA})
    text = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
    m = re.search(r"window\.TN_CANDIDATES\s*=\s*(\[.*\])\s*;?\s*$", text, re.DOTALL)
    if not m:
        raise ValueError("could not locate window.TN_CANDIDATES")
    cands = json.loads(m.group(1))
    print(f"fetched {len(cands)} candidates")

    rows = [{
        "ac_no":       c.get("acNo"),
        "sl_no":       c.get("slNo"),
        "name":        (c.get("name") or "").strip()[:200],
        "party":       c.get("party"),
        "alliance":    c.get("alliance"),
        "gender":      c.get("gender"),
        "age":         c.get("age") if isinstance(c.get("age"), int) else None,
        "education":   c.get("education"),
        "profession":  c.get("profession"),
        "symbol":      c.get("symbol"),
        "assets_text": c.get("assets"),
        "assets_cr":   _parse_assets(c.get("assets")),
        "criminal":    bool(c.get("criminal")),
        "result":      c.get("result"),
    } for c in cands if c.get("acNo") and c.get("name")]

    n = 0
    for i in range(0, len(rows), 200):
        db.table("election_candidates").upsert(rows[i:i + 200], on_conflict="ac_no,sl_no,name").execute()
        n += len(rows[i:i + 200])

    total = db.table("election_candidates").select("id", count="exact").execute().count
    won = sum(1 for r in rows if r["result"] == "won")
    crim = sum(1 for r in rows if r["criminal"])
    women = sum(1 for r in rows if (r["gender"] or "").lower().startswith("f"))
    print(f"==== loaded {n} | table {total} | winners~{won} | criminal {crim} | women {women} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
