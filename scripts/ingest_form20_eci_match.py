"""Recover the 3 column-offset Chennai-area ACs (27/30/31) via ECI value-match.

These Form 20 PDFs have a non-standard column layout, so positional mapping (used
by ingest_form20_chennai.py) misattributes votes and the integrity gate correctly
rejects them. Here we instead map each Form 20 column to a candidate by matching
its summed votes to the official ECI per-candidate EVM total — offset/order
irrelevant. The 4 major buckets come straight from their matched columns; the
booth total comes from the total-valid column; OTHERS = total - majors, so every
booth still sums exactly. Validated: parsed winner must equal the official winner.

ECI EVM totals are embedded (fetched from results.eci.gov.in). Loads into
election_booth_results. Idempotent (delete+insert per AC).

    python scripts/ingest_form20_eci_match.py
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
import pdfplumber  # noqa: E402
from app.database import get_db  # noqa: E402


def _bucket(party: str) -> str:
    p = (party or "").lower()
    if "tamilaga vettri" in p:
        return "TVK"
    if "naam tamilar" in p or "naam tamizhar" in p:
        return "NTK"
    if "anna dravida" in p or "desiya murpokku" in p or "pattali" in p or "bharatiya janata" in p:
        return "ADMK+"
    if p == "dravida munnetra kazhagam" or "indian national congress" in p or "viduthalai" in p or "communist" in p:
        return "DMK+"
    return "OTHERS"  # minor parties, independents, NOTA


# Official ECI per-candidate EVM votes (results.eci.gov.in, 2026). (evm_votes, party)
ECI: dict[int, dict] = {
    27: {"total": 445292, "winner": "TVK", "cands": [
        (122813, "Dravida Munnetra Kazhagam"), (73604, "All India Anna Dravida Munnetra Kazhagam"),
        (521, "BSP"), (21844, "Naam Tamilar Katchi"), (123, "x"), (485, "x"),
        (219807, "Tamilaga Vettri Kazhagam"), (320, "x"), (245, "x"), (189, "x"), (100, "x"),
        (214, "x"), (149, "x"), (114, "x"), (170, "x"), (249, "x"), (414, "x"), (525, "x"),
        (98, "x"), (66, "x"), (153, "x"), (115, "x"), (263, "x"), (159, "x"), (253, "x"),
        (113, "x"), (123, "x"), (2063, "NOTA")]},
    30: {"total": 281816, "winner": "TVK", "cands": [
        (13961, "Naam Tamilar Katchi"), (554, "BSP"), (78342, "Desiya Murpokku Dravida Kazhagam"),
        (48309, "All India Anna Dravida Munnetra Kazhagam"), (346, "x"), (375, "x"),
        (133119, "Tamilaga Vettri Kazhagam"), (548, "x"), (275, "x"), (294, "x"), (437, "x"),
        (230, "x"), (77, "x"), (235, "x"), (319, "x"), (179, "x"), (298, "x"), (102, "x"),
        (427, "x"), (1271, "x"), (98, "x"), (232, "x"), (208, "x"), (1580, "NOTA")]},
    31: {"total": 276997, "winner": "TVK", "cands": [
        (61381, "All India Anna Dravida Munnetra Kazhagam"), (82642, "Dravida Munnetra Kazhagam"),
        (11554, "Naam Tamilar Katchi"), (287, "BSP"), (118577, "Tamilaga Vettri Kazhagam"),
        (157, "x"), (69, "x"), (49, "x"), (82, "x"), (112, "x"), (158, "x"), (97, "x"),
        (62, "x"), (93, "x"), (180, "x"), (1497, "NOTA")]},
}
_MAJORS = ("TVK", "DMK+", "ADMK+", "NTK")


def _parse(ac: int):
    booths, seen = [], set()
    with pdfplumber.open(ROOT / "scratch_form20" / f"{ac}.pdf") as pdf:
        for pg in pdf.pages:
            for t in pg.extract_tables():
                for row in t:
                    c0 = (row[0] or "").strip() if row and row[0] else ""
                    if c0.isdigit():
                        bn = int(c0)
                        if bn in seen:   # dedupe spurious repeated serials
                            continue
                        seen.add(bn)
                        booths.append((bn,
                                       [int((x or "").strip()) if (x or "").strip().isdigit() else 0
                                        for x in row[1:]]))
    return booths


def run() -> int:
    db = get_db()
    loaded, total_booths = [], 0
    for ac, info in ECI.items():
        booths = _parse(ac)
        ncol = max(len(v) for _, v in booths)
        sums = [sum(v[i] for _, v in booths if i < len(v)) for i in range(ncol)]

        # total-valid column = the column whose sum is closest to the ECI total EVM
        tv_col = min(range(ncol), key=lambda i: abs(sums[i] - info["total"]))
        # match every ECI candidate to its column by value (greedy unique nearest)
        col_bucket: dict[int, str] = {}
        used: set[int] = set()
        for votes, party in sorted(info["cands"], reverse=True):
            cand = [(abs(sums[i] - votes), i) for i in range(ncol)
                    if i not in used and i != tv_col]
            if not cand:
                continue
            diff, ci = min(cand)
            if diff <= max(120, 0.02 * votes):
                used.add(ci); col_bucket[ci] = _bucket(party)

        # per booth: 4 majors from their columns; OTHERS = total - majors
        rows, ac_tot = [], {}
        ok = True
        for booth_no, vals in booths:
            pv = {m: 0 for m in _MAJORS}
            for ci, bk in col_bucket.items():
                if bk in _MAJORS and ci < len(vals):
                    pv[bk] += vals[ci]
            total = vals[tv_col] if tv_col < len(vals) else sum(pv.values())
            others = total - sum(pv.values())
            if others < 0:
                ok = False; break
            pv["OTHERS"] = others
            for bk, v in pv.items():
                if v:
                    ac_tot[bk] = ac_tot.get(bk, 0) + v
                    rows.append({"ac_no": ac, "booth_no": booth_no, "party": bk, "votes": v, "total_polled": total})

        parsed_winner = max((p for p in ac_tot if p != "OTHERS"), key=ac_tot.get, default=None)
        if not ok or parsed_winner != info["winner"]:
            print(f"  AC {ac}: SKIP (ok={ok}, parsed {parsed_winner} != {info['winner']})")
            continue
        db.table("election_booth_results").delete().eq("ac_no", ac).execute()
        for i in range(0, len(rows), 500):
            db.table("election_booth_results").insert(rows[i:i + 500]).execute()
        nb = len({b for b, _ in booths})
        loaded.append(ac); total_booths += nb
        print(f"  AC {ac}: {nb} booths · winner {parsed_winner} · "
              f"TVK {ac_tot.get('TVK',0)} / DMK+ {ac_tot.get('DMK+',0)} / "
              f"ADMK+ {ac_tot.get('ADMK+',0)} / NTK {ac_tot.get('NTK',0)} / OTH {ac_tot.get('OTHERS',0)} ✓")
    print(f"==== ECI-matched recovery: loaded {loaded} · {total_booths} booths ====")
    return 0


if __name__ == "__main__":
    sys.exit(run())
