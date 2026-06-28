"""Ingest AC-level 2026 TN election data (P0/P1, OBSERVED layer).

Source: tnelections2026.in static data files (an ECI-derived aggregator — the
accessible feed; ECI itself is WAF-blocked). We load all 234 constituencies with
their elector gender split, 2021 winner and 2026 winner. Candidate-level vote
counts / margins are a follow-up pass once the candidates bundle is mapped.

Run AFTER applying database/026_election.sql. Idempotent (upsert on ac_no).

    python scripts/ingest_election_ac.py
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
_SRC = "https://tnelections2026.in/data/constituencies.js"


def _fetch_js_array(url: str, var_name: str) -> list[dict]:
    """Pull `var <var_name> = [ ... ];` out of a static JS file and json.loads it."""
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        text = r.read().decode("utf-8", "replace")
    m = re.search(re.escape(var_name) + r"\s*=\s*(\[.*?\])\s*;", text, re.DOTALL)
    if not m:
        raise ValueError(f"could not locate {var_name} array in {url}")
    return json.loads(m.group(1))


def run() -> int:
    db = get_db()
    items = _fetch_js_array(_SRC, "TN_CONSTITUENCIES_234")
    print(f"fetched {len(items)} constituencies")
    rows = [{
        "ac_no":            it.get("id"),
        "ac_name":          it.get("name"),
        "district":         it.get("district"),
        "category":         it.get("category"),
        "electors":         it.get("electors"),
        "electors_male":    it.get("male"),
        "electors_female":  it.get("female"),
        "electors_third":   it.get("thirdGender"),
        "candidates_count": it.get("candidates"),
        "winner_2021":      it.get("prevWinner"),
        "winner_2026":      it.get("winner2026"),
    } for it in items if it.get("id")]

    n = 0
    for i in range(0, len(rows), 100):
        chunk = rows[i:i + 100]
        db.table("election_constituencies").upsert(chunk, on_conflict="ac_no").execute()
        n += len(chunk)

    total = db.table("election_constituencies").select("ac_no", count="exact").execute().count
    # quick sanity: 2021->2026 flips and district coverage
    flips = sum(1 for r in rows if r["winner_2021"] and r["winner_2026"]
                and r["winner_2021"] != r["winner_2026"])
    districts = len({r["district"] for r in rows if r["district"]})
    print(f"==== loaded {n} | table now {total} | districts {districts} | 2021->2026 flips {flips} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
