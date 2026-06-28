"""Fill remaining ACs via the coordinate parser (borderless Form 20 template).

Runs the coordinate-based parser (_coord_parse) on every AC that doesn't yet have
booth data, with the same two no-flaws gates: per-booth candidate-block sum ==
Total-Valid, and parsed top bucket == official winner. Whatever passes loads;
the rest stay skipped (recover later). Process-pool parallel.

    python scripts/ingest_form20_coord_run.py
"""
from __future__ import annotations
import os, sys, re, json, time, urllib.request
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend")); sys.path.insert(0, str(ROOT / "scripts"))
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("="); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
from supabase import create_client  # noqa: E402
from app.config import settings  # noqa: E402
from _coord_parse import parse_coord, candidate_block  # noqa: E402

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"
_BASE = "https://www.elections.tn.gov.in/"
_CAND = "https://tnelections2026.in/data/candidates_bundle.min.js"
_DIR = ROOT / "scratch_form20_state"
_WORKERS = 8
_ALLIANCE = {"tvk": "TVK", "spa": "DMK+", "nda": "ADMK+", "ntk": "NTK"}
def _bk(c): return _ALLIANCE.get((c.get("alliance") or "").lower(), "OTHERS")
def _norm(p): return "ADMK" if (p or "").strip() in ("AIADMK", "ADMK") else (p or "").strip()

_pdb = None
def _db():
    global _pdb
    if _pdb is None:
        _pdb = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _pdb

def _get(url, binary=False, tries=3):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": _UA}), timeout=90).read() \
                if binary else urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": _UA}), timeout=90).read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1: raise
            time.sleep(1.5 * (i + 1))


def _process(ac, url, cands, official):
    try:
        path = _DIR / f"AC{ac:03d}.pdf"
        if not path.exists() or path.stat().st_size < 1000:
            path.write_bytes(_get(url, binary=True))
        booths = parse_coord(str(path))
    except Exception as e:
        return (ac, "skip", f"parse error: {e}")
    if len(booths) < 5:
        return (ac, "skip", f"only {len(booths)} booths")
    ncand = len(cands)
    ncol = max(len(v) for _, v in booths)
    cs = [sum(v[i] for _, v in booths if i < len(v)) for i in range(ncol)]
    blk = candidate_block(cs, max(4, ncand - 1))  # reject narrow 'totals' blocks
    if not blk:
        return (ac, "skip", "no candidate block")
    k, tv = blk
    ac_tot, rows, bad = {}, [], 0
    for bn, vec in booths:
        if tv >= len(vec):
            bad += 1; continue
        pv = {}
        for j in range(k, tv):
            bucket = _bk(cands[j - k]) if (j - k) < ncand else "OTHERS"
            pv[bucket] = pv.get(bucket, 0) + vec[j]
        if sum(pv.values()) != vec[tv]:
            bad += 1
        for party, val in pv.items():
            ac_tot[party] = ac_tot.get(party, 0) + val
            rows.append({"ac_no": ac, "booth_no": bn, "party": party, "votes": val, "total_polled": vec[tv]})
    if bad > max(2, 0.01 * len(booths)):
        return (ac, "skip", f"integrity {bad}/{len(booths)}")
    pw = max((p for p in ac_tot if p not in ("OTHERS", "NOTA")), key=ac_tot.get, default=None)
    if pw != official:
        return (ac, "skip", f"winner {pw} != {official}")
    try:
        db = _db()
        db.table("election_booth_results").delete().eq("ac_no", ac).execute()
        for i in range(0, len(rows), 500):
            db.table("election_booth_results").insert(rows[i:i + 500]).execute()
    except Exception as e:
        return (ac, "skip", f"db error: {e}")
    return (ac, "ok", len({b for b, _ in booths}))


def run() -> int:
    main = create_client(settings.supabase_url, settings.supabase_service_role_key)
    arr = json.loads(re.search(r"window\.TN_CANDIDATES\s*=\s*(\[.*\])\s*;?\s*$", _get(_CAND), re.DOTALL).group(1))
    roster, p2b = {}, {}
    for c in arr:
        if c.get("acNo"):
            roster.setdefault(c["acNo"], []).append(c); p2b[_norm(c.get("party"))] = _bk(c)
    for a in roster: roster[a].sort(key=lambda c: c.get("slNo") or 0)
    winners = {c["ac_no"]: p2b.get(_norm(c.get("winner_2026")), "OTHERS")
               for c in main.table("election_constituencies").select("ac_no,winner_2026").execute().data}
    # already-loaded ACs
    have, off = set(), 0
    while True:
        b = main.table("election_booth_results").select("ac_no").range(off, off + 999).execute().data or []
        have.update(r["ac_no"] for r in b)
        if len(b) < 1000: break
        off += 1000
    html = _get(_BASE + "Form20_TNLA2026.aspx")
    urls = {int(m.group(2)): _BASE + m.group(1) for m in re.finditer(r'(Form20_TNLA2026/dt[0-9]+/AC([0-9]+)\.pdf)', html)}
    todo = [ac for ac in sorted(urls) if ac not in have and roster.get(ac)]
    print(f"already loaded: {len(have)} | to attempt (coord): {len(todo)}", flush=True)

    loaded, skipped, t0 = [], [], time.time()
    with ProcessPoolExecutor(max_workers=_WORKERS) as ex:
        futs = {ex.submit(_process, ac, urls[ac], roster[ac], winners.get(ac)): ac for ac in todo}
        for i, fut in enumerate(as_completed(futs), 1):
            ac, st, detail = fut.result()
            (loaded if st == "ok" else skipped).append((ac, detail))
            if i % 20 == 0:
                print(f"  ...{i}/{len(todo)} ({len(loaded)} new) {time.time()-t0:.0f}s", flush=True)
    print(f"\n==== COORD: +{len(loaded)} ACs loaded · still skipped {len(skipped)} · {time.time()-t0:.0f}s ====")
    print("loaded:", sorted(a for a, _ in loaded))
    for ac, why in sorted(skipped): print(f"   AC {ac}: {why}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
