"""Candidate affidavit profiles from MyNeta/ADR (TamilNadu2026).

Scrapes the per-constituency candidate tables (~234 pages) — declared criminal
cases (count), assets, liabilities, education, age, party — maps MyNeta
constituency -> ECI AC by name and party -> our alliance bucket, marks each
bucket's lead contestant, and stores in election_candidates (migration 027).

Run AFTER applying database/027_election_candidates.sql.
    python scripts/ingest_myneta_candidates.py
"""
from __future__ import annotations
import os, sys, re, html, time, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
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
_BASE = "https://www.myneta.info/TamilNadu2026/"


# MyNeta uses party CODES for major parties (DMK, ADMK, INC...) and full names
# for newer ones (TVK, NTK). 2026 alliances: DMDK in SPA, AMMK in NDA.
_SPA = {"DMK", "INC", "VCK", "CPI", "CPM", "CPI(M)", "MDMK", "IUML", "KMDK", "MMK", "DMDK", "MVK", "MDMK(S)"}
_NDA = {"ADMK", "AIADMK", "PMK", "BJP", "AMMK", "TMC(M)", "PT", "GKMK", "PMKM"}
def _bucket(party: str) -> str:
    pu = (party or "").strip().upper()
    pl = (party or "").lower()
    if pu == "TVK" or "tamilaga vettri" in pl: return "TVK"
    if pu == "NTK" or "naam tamilar" in pl or "naam tamizhar" in pl: return "NTK"
    if pu in _SPA or pl == "dravida munnetra kazhagam" or "indian national congress" in pl \
            or "viduthalai" in pl or "communist" in pl or "desiya murpokku" in pl or "indian union muslim" in pl:
        return "DMK+"
    if pu in _NDA or "anna dravida" in pl or "pattali" in pl or "bharatiya janata" in pl or "amma makkal" in pl:
        return "ADMK+"
    return "OTHERS"


def _norm(s):
    return re.sub(r"[^a-z]", "", re.sub(r"\(s[ct]\)", "", (s or "").lower()))


def _rs(text):
    m = re.search(r"Rs[\s\xa0]*([\d,]+)", text)
    return int(m.group(1).replace(",", "")) if m else None


def _get(url, tries=3):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": _UA}), timeout=60).read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1: raise
            time.sleep(1.0 * (i + 1))


def _parse_constituency(cid):
    """-> [candidate dicts]. Row cells: SNo, Name, Party, Criminal, Education,
    Age, Total Assets, Liabilities."""
    h = _get(f"{_BASE}index.php?action=show_candidates&constituency_id={cid}")
    cands = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", h, re.S):
        am = re.search(r"candidate_id=(\d+)[^>]*>(.*?)</a>", tr, re.S)
        if not am:
            continue
        cells = [re.sub(r"<[^>]+>", "", html.unescape(c)).replace("\xa0", " ").strip()
                 for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        if len(cells) < 8:
            continue
        party, crim, edu, age, assets, liab = cells[2], cells[3], cells[4], cells[5], cells[6], cells[7]
        cands.append({
            "myneta_id": int(am.group(1)),
            "name": re.sub(r"<[^>]+>", "", html.unescape(am.group(2))).strip(),
            "party": party, "bucket": _bucket(party),
            "criminal_cases": int(crim) if crim.isdigit() else 0,
            "education": edu or None,
            "age": int(age) if age.isdigit() else None,
            "assets_text": assets or None, "assets_rs": _rs(assets), "liabilities_rs": _rs(liab),
        })
    return cands


def run(dry=False) -> int:
    db = get_db()
    ac_by_name = {_norm(c["ac_name"]): c["ac_no"]
                  for c in (db.table("election_constituencies").select("ac_no,ac_name").execute().data or [])}
    # MyNeta constituency_id -> name, from the index page
    idx = _get(_BASE)
    id2name = {int(a): re.sub(r"<[^>]+>", "", b).strip()
               for a, b in re.findall(r"constituency_id=(\d+)[^>]*>([^<]+)</a>", idx)}
    all_rows, unmatched = [], []
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(_parse_constituency, cid): cid for cid in id2name}
        import difflib
        _alias = {"drradhakrishnannagar": "rknagar", "thiyagarayanagar": "tnagar"}
        names = list(ac_by_name)
        for fut in as_completed(futs):
            cid = futs[fut]
            key = _norm(id2name.get(cid, ""))
            key = _alias.get(key, key)
            ac = ac_by_name.get(key)
            if not ac:                                  # fuzzy fallback (transliteration)
                close = difflib.get_close_matches(key, names, n=1, cutoff=0.82)
                ac = ac_by_name.get(close[0]) if close else None
            if not ac:
                unmatched.append(id2name.get(cid)); continue
            for c in fut.result():
                c["ac_no"] = ac
                c["is_lead"] = c.get("bucket") in ("TVK", "DMK+", "ADMK+", "NTK")
                all_rows.append(c)
    print(f"parsed {len(all_rows)} candidates across {234-len(unmatched)} matched ACs | unmatched: {unmatched[:8]}")
    if dry:
        from collections import Counter
        print("bucket spread:", dict(Counter(c["bucket"] for c in all_rows)))
        print("with criminal cases:", sum(1 for c in all_rows if c["criminal_cases"] > 0))
        return 0
    db.table("election_candidates").delete().neq("ac_no", 0).execute()
    for i in range(0, len(all_rows), 500):
        db.table("election_candidates").insert(all_rows[i:i + 500]).execute()
    print(f"==== loaded {len(all_rows)} candidate profiles ====")
    return 0


if __name__ == "__main__":
    sys.exit(run(dry="--dry" in sys.argv))
