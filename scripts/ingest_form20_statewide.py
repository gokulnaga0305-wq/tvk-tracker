"""Statewide booth-level Form 20 ingestion — all 234 TN ACs, PARALLEL (processes).

Source: official CEO Tamil Nadu Form 20 portal (Form20_TNLA2026.aspx) — direct
PDF per AC, no CAPTCHA, no PII. Downloads + parses + loads every AC concurrently
across a PROCESS pool (each worker has its own Supabase client), so both the
downloads AND the CPU-bound pdfplumber parsing run truly in parallel (threads
would serialize parsing on the GIL).

No-flaws gates unchanged: positional column->candidate->alliance map, then
(1) every booth's bucket sum == Form 20 Total-Valid column, and (2) parsed top
bucket == official winner. Fail either -> SKIP (logged), recover via ECI match.

    python scripts/ingest_form20_statewide.py
"""
from __future__ import annotations
import os, sys, re, json, time, urllib.request
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("="); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
import pdfplumber  # noqa: E402
from supabase import create_client  # noqa: E402
from app.config import settings  # noqa: E402

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"
_BASE = "https://www.elections.tn.gov.in/"
_PAGE = _BASE + "Form20_TNLA2026.aspx"
_CAND = "https://tnelections2026.in/data/candidates_bundle.min.js"
_DIR = ROOT / "scratch_form20_state"; _DIR.mkdir(exist_ok=True)
_WORKERS = 8

_ALLIANCE_BUCKET = {"tvk": "TVK", "spa": "DMK+", "nda": "ADMK+", "ntk": "NTK"}
_PLAYERS = ("TVK", "DMK+", "ADMK+", "NTK")
def _bucket(c): return _ALLIANCE_BUCKET.get((c.get("alliance") or "").lower(), "OTHERS")
def _norm(p): return "ADMK" if (p or "").strip() in ("AIADMK", "ADMK") else (p or "").strip()

# One Supabase client per worker PROCESS (lazy, module-global).
_proc_db = None
def _db():
    global _proc_db
    if _proc_db is None:
        _proc_db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _proc_db

def _log(msg):
    print(msg, flush=True)


def _get(url, binary=False, tries=3):
    for i in range(tries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": _UA}), timeout=90)
            return r.read() if binary else r.read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(1.5 * (i + 1))


def _roster():
    arr = json.loads(re.search(r"window\.TN_CANDIDATES\s*=\s*(\[.*\])\s*;?\s*$", _get(_CAND), re.DOTALL).group(1))
    by_ac, p2b = {}, {}
    for c in arr:
        if c.get("acNo"):
            by_ac.setdefault(c["acNo"], []).append(c); p2b[_norm(c.get("party"))] = _bucket(c)
    for ac in by_ac:
        by_ac[ac].sort(key=lambda c: c.get("slNo") or 0)
    return by_ac, p2b


def _urls():
    html = _get(_PAGE)
    return {int(m.group(2)): _BASE + m.group(1)
            for m in re.finditer(r'(Form20_TNLA2026/dt[0-9]+/AC([0-9]+)\.pdf)', html)}


def _parse(path):
    booths, seen = [], set()
    with pdfplumber.open(path) as pdf:
        for pg in pdf.pages:
            for t in pg.extract_tables():
                for row in t:
                    c0 = (row[0] or "").strip() if row and row[0] else ""
                    if c0.isdigit() and int(c0) not in seen:
                        seen.add(int(c0))
                        booths.append((int(c0), [int((x or "").strip()) if (x or "").strip().isdigit() else 0
                                                 for x in row[1:]]))
    return booths


def _process(ac, url, cands, official):
    """One AC end-to-end: download (cache) -> parse -> validate -> load."""
    try:
        path = _DIR / f"AC{ac:03d}.pdf"
        if not path.exists() or path.stat().st_size < 1000:
            path.write_bytes(_get(url, binary=True))
        booths = _parse(path)
    except Exception as e:
        return (ac, "skip", f"fetch/parse error: {e}")
    if not booths:
        return (ac, "skip", "no booths")
    ncand = len(cands)
    ac_tot, rows, bad = {}, [], 0
    for booth_no, vals in booths:
        pv, lead = {}, {}
        for i in range(min(ncand, len(vals))):
            bk = _bucket(cands[i]); pv[bk] = pv.get(bk, 0) + vals[i]
            if bk in _PLAYERS and vals[i] >= lead.get(bk, ("", -1))[1]:
                lead[bk] = (cands[i].get("name"), vals[i])
        total = vals[ncand] if len(vals) > ncand else sum(pv.values())
        if sum(pv.values()) != total:
            bad += 1
        for party, v in pv.items():
            ac_tot[party] = ac_tot.get(party, 0) + v
            rows.append({"ac_no": ac, "booth_no": booth_no, "party": party,
                         "candidate": lead.get(party, (None,))[0], "votes": v, "total_polled": total})
    if bad:
        return (ac, "skip", f"structure mismatch {bad}/{len(booths)}")
    pw = max((p for p in ac_tot if p not in ("OTHERS", "NOTA")), key=ac_tot.get, default=None)
    if pw != official:
        return (ac, "skip", f"winner {pw} != official {official}")
    try:
        db = _db()
        db.table("election_booth_results").delete().eq("ac_no", ac).execute()
        for i in range(0, len(rows), 500):
            db.table("election_booth_results").insert(rows[i:i + 500]).execute()
    except Exception as e:
        return (ac, "skip", f"db error: {e}")
    return (ac, "ok", (len({b for b, _ in booths}), pw))


def run() -> int:
    roster, p2b = _roster()
    main_db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    winners = {c["ac_no"]: p2b.get(_norm(c.get("winner_2026")), "OTHERS")
               for c in (main_db.table("election_constituencies").select("ac_no,winner_2026").execute().data or [])}
    urls = _urls()
    _log(f"Form 20 PDFs: {len(urls)} | running {_WORKERS} parallel workers")

    loaded, skipped, total_booths, done = [], [], 0, 0
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=_WORKERS) as ex:
        futs = {ex.submit(_process, ac, urls[ac], roster.get(ac, []), winners.get(ac)): ac
                for ac in sorted(urls) if roster.get(ac)}
        for fut in as_completed(futs):
            ac, status, detail = fut.result()
            done += 1
            if status == "ok":
                nb, pw = detail; loaded.append(ac); total_booths += nb
            else:
                skipped.append((ac, detail))
            if done % 25 == 0:
                _log(f"  ...{done}/{len(futs)} processed ({len(loaded)} loaded) {time.time()-t0:.0f}s")

    _log(f"\n==== STATEWIDE PARALLEL: loaded {len(loaded)} ACs · {total_booths} booths · "
         f"skipped {len(skipped)} · {time.time()-t0:.0f}s ====")
    for ac, why in sorted(skipped):
        _log(f"   AC {ac}: {why}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
