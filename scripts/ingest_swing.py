"""2021 -> 2026 alliance vote-share swing per AC (full-count, no sampling).

2021: TCPD AC-level results (all 234 ACs), bucketed with the 2021 alliances
(DMDK + AMMK in the AMMK front = OTHERS; no TVK). 2026: aggregated from the
booth-level Form 20 we loaded (election_booth_results). Stores alliance-level
vote totals + share per AC per year in election_ac_results so the swing API can
diff them. "Where parties lost their holds."

    python scripts/ingest_swing.py
"""
from __future__ import annotations
import os, sys, csv, urllib.request
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
_TCPD = ("https://data.opencity.in/dataset/74f05dff-eac3-4e2b-80cd-3382e9c190d5/resource/"
         "5ca1808c-4b8a-4fa6-957e-409e690f509d/download/b89dceb3-b295-4d9b-af6d-b71d2a86ee49.csv")

# 2021 alliances (user-confirmed): DMDK/AMMK in the AMMK front -> OTHERS; no TVK.
_2021_SPA = {"DMK", "INC", "VCK", "CPI", "CPM", "CPI(M)", "MDMK", "IUML", "KMDK", "MMK", "MVK", "AIFB"}
_2021_NDA = {"ADMK", "AIADMK", "BJP", "PMK", "TMC(M)", "PT", "PTMK"}
def _bk2021(p):
    p = (p or "").strip()
    if p in _2021_SPA: return "DMK+"
    if p in _2021_NDA: return "ADMK+"
    if p == "NTK": return "NTK"
    return "OTHERS"


def _rows_for(ac_no, year, bucket_votes):
    total = sum(bucket_votes.values()) or 1
    return [{"ac_no": ac_no, "year": year, "candidate_name": b, "party": b, "alliance": b,
             "votes": v, "vote_share": round(v / total * 100, 2)}
            for b, v in bucket_votes.items()]


def run() -> int:
    db = get_db()
    # ---- 2021 from TCPD ------------------------------------------------------
    text = urllib.request.urlopen(urllib.request.Request(_TCPD, headers={"User-Agent": _UA}), timeout=90).read().decode("utf-8", "replace")
    rows = list(csv.DictReader(text.splitlines()))
    by_ac_21: dict[int, dict] = {}
    for r in rows:
        if r.get("Year") != "2021":
            continue
        try:
            ac = int(r["Constituency_No"]); v = int(r["Votes"])
        except (ValueError, KeyError):
            continue
        by_ac_21.setdefault(ac, {}).setdefault(_bk2021(r["Party"]), 0)
        by_ac_21[ac][_bk2021(r["Party"])] += v

    # ---- 2026 from booth data -----------------------------------------------
    booth, off = [], 0
    while True:
        b = db.table("election_booth_results").select("ac_no,party,votes").range(off, off + 999).execute().data or []
        booth.extend(b)
        if len(b) < 1000: break
        off += 1000
    by_ac_26: dict[int, dict] = {}
    for r in booth:
        by_ac_26.setdefault(r["ac_no"], {}).setdefault(r["party"], 0)
        by_ac_26[r["ac_no"]][r["party"]] += r["votes"]

    # ---- write (idempotent: clear both years, reinsert) ---------------------
    db.table("election_ac_results").delete().in_("year", [2021, 2026]).execute()
    out = []
    for ac, bv in by_ac_21.items():
        out += _rows_for(ac, 2021, bv)
    for ac, bv in by_ac_26.items():
        out += _rows_for(ac, 2026, bv)
    for i in range(0, len(out), 500):
        db.table("election_ac_results").insert(out[i:i + 500]).execute()

    print(f"==== swing data: 2021 ACs {len(by_ac_21)} | 2026 ACs {len(by_ac_26)} | rows {len(out)} ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
