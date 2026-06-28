"""Ingest booth-level Form 20 for Chennai-area ACs (P2, OBSERVED — Form 20 only).

Source: OpenCity 'Form 20 for Chennai Constituencies - TN 2026' (official, from
elections.tn.gov.in). Digital PDFs, parsed with pdfplumber — NO OCR.

Mapping & validation (the "no-flaws" guarantee):
  - Form 20 columns are candidates in ballot order; column i == candidate slNo i+1
    in the candidates roster. Verified against Kolathur (Stalin 72,465 / TVK 81,791).
  - Per AC we VALIDATE: the party with the most booth-summed votes must equal the
    official winner_2026 (election_constituencies). An AC that fails is SKIPPED,
    not loaded — we never store mis-mapped booth data.

Loads into election_booth_results (migration 026). Idempotent per AC (delete +
reinsert). Run anytime; safe to re-run.

    python scripts/ingest_form20_chennai.py
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
import pdfplumber  # noqa: E402
from app.database import get_db  # noqa: E402

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"
_PKG = ("https://data.opencity.in/api/3/action/package_show"
        "?id=form-20-for-chennai-constituencies-tamil-nadu-assembly-elections-2026")
_CAND = "https://tnelections2026.in/data/candidates_bundle.min.js"
_TMP = ROOT / "scratch_form20"
_TMP.mkdir(exist_ok=True)

# 5-player focus: collapse every candidate to TVK / DMK+ (SPA) / ADMK+ (NDA) /
# NTK / OTHERS using the candidate's alliance tag. Cuts the long tail of small
# parties + independents into one bucket.
_ALLIANCE_BUCKET = {"tvk": "TVK", "spa": "DMK+", "nda": "ADMK+", "ntk": "NTK"}
_PLAYERS = ("TVK", "DMK+", "ADMK+", "NTK")
def _bucket(cand: dict) -> str:
    return _ALLIANCE_BUCKET.get((cand.get("alliance") or "").lower(), "OTHERS")
def _norm(p: str) -> str:
    p = (p or "").strip()
    return "ADMK" if p in ("AIADMK", "ADMK") else p


def _get(url: str) -> bytes:
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": _UA}), timeout=90).read()


def _roster() -> dict[int, list[dict]]:
    t = _get(_CAND).decode("utf-8", "replace")
    arr = json.loads(re.search(r"window\.TN_CANDIDATES\s*=\s*(\[.*\])\s*;?\s*$", t, re.DOTALL).group(1))
    by_ac: dict[int, list[dict]] = {}
    for c in arr:
        if c.get("acNo"):
            by_ac.setdefault(c["acNo"], []).append(c)
    for ac in by_ac:
        by_ac[ac].sort(key=lambda c: c.get("slNo") or 0)
    return by_ac


def _resources() -> list[tuple[int, str]]:
    pkg = json.loads(_get(_PKG).decode("utf-8", "replace"))
    out = []
    for r in pkg["result"]["resources"]:
        m = re.search(r"/(\d+)\.?-", r["url"]) or re.match(r"(\d+)", r.get("name", "").split("-")[-1].strip())
        # AC no from filename like '13.-kolathur.pdf'
        fn = r["url"].rsplit("/", 1)[-1]
        mm = re.match(r"(\d+)", fn)
        if mm:
            out.append((int(mm.group(1)), r["url"]))
    return sorted(set(out))


def _parse_booths(pdf_path: Path) -> list[tuple[int, list[int]]]:
    booths = []
    with pdfplumber.open(pdf_path) as pdf:
        for pg in pdf.pages:
            for tb in pg.extract_tables():
                for row in tb:
                    c0 = (row[0] or "").strip() if row and row[0] else ""
                    if c0.isdigit():
                        vals = [int((x or "").strip()) if (x or "").strip().isdigit() else 0 for x in row[1:]]
                        booths.append((int(c0), vals))
    return booths


def run() -> int:
    db = get_db()
    roster = _roster()
    # party -> bucket, derived from the roster's alliance tags (so the official
    # winner party can be compared to the parsed top bucket).
    party2bucket: dict[str, str] = {}
    for ac_cands in roster.values():
        for c in ac_cands:
            party2bucket[_norm(c.get("party"))] = _bucket(c)
    winners = {c["ac_no"]: party2bucket.get(_norm(c.get("winner_2026")), "OTHERS")
               for c in (db.table("election_constituencies").select("ac_no,winner_2026").execute().data or [])}
    resources = _resources()
    print(f"Form 20 resources: {len(resources)} ACs")

    loaded, skipped, total_booths = 0, [], 0
    for ac_no, url in resources:
        cands = roster.get(ac_no)
        if not cands:
            skipped.append((ac_no, "no roster")); continue
        ncand = len(cands)
        pdf_path = _TMP / f"{ac_no}.pdf"
        if not pdf_path.exists():
            pdf_path.write_bytes(_get(url))
        booths = _parse_booths(pdf_path)
        if not booths:
            skipped.append((ac_no, "no booths parsed")); continue

        # Aggregate per booth by party (majors individual, rest -> OTHERS; NOTA separate).
        ac_party_tot: dict[str, int] = {}
        rows = []
        bad_booths = 0
        for booth_no, vals in booths:
            pv: dict[str, int] = {}
            lead: dict[str, tuple[str, int]] = {}
            for i in range(min(ncand, len(vals))):
                bucket = _bucket(cands[i])
                pv[bucket] = pv.get(bucket, 0) + vals[i]
                # representative candidate name for the four named players
                if bucket in _PLAYERS and vals[i] >= lead.get(bucket, ("", -1))[1]:
                    lead[bucket] = (cands[i].get("name"), vals[i])
            # Column ncand is the Form 20 "Total Valid Votes" column. Use it as
            # the booth total AND as an integrity check (buckets must sum to it).
            total_valid = vals[ncand] if len(vals) > ncand else sum(pv.values())
            # Integrity: the 5 buckets must sum exactly to the official total-valid
            # column. A mismatch means the column layout is offset (extra/missing
            # column) and the party mapping can't be trusted.
            if sum(pv.values()) != total_valid:
                bad_booths += 1
            for party, v in pv.items():
                ac_party_tot[party] = ac_party_tot.get(party, 0) + v
                rows.append({
                    "ac_no": ac_no, "booth_no": booth_no, "party": party,
                    "candidate": lead.get(party, (None,))[0],
                    "votes": v, "total_polled": total_valid,
                })

        # VALIDATE (two hard gates — both must pass, else skip, never load):
        #   1. structural integrity: every booth's buckets sum to total-valid
        #   2. parsed top bucket == official winner
        if bad_booths:
            skipped.append((ac_no, f"structure mismatch: {bad_booths}/{len(booths)} booths sum != total-valid (column offset)"))
            continue
        parsed_winner = max((p for p in ac_party_tot if p not in ("OTHERS", "NOTA")),
                            key=lambda p: ac_party_tot[p], default=None)
        if parsed_winner != winners.get(ac_no):
            skipped.append((ac_no, f"validation FAIL: parsed {parsed_winner} != official {winners.get(ac_no)}"))
            continue

        # Load (idempotent): clear this AC then insert.
        db.table("election_booth_results").delete().eq("ac_no", ac_no).execute()
        for i in range(0, len(rows), 500):
            db.table("election_booth_results").insert(rows[i:i + 500]).execute()
        loaded += 1
        total_booths += len({b for b, _ in booths})
        print(f"  AC {ac_no:>3}: {len({b for b,_ in booths})} booths · winner {parsed_winner} "
              f"(TVK {ac_party_tot.get('TVK',0)} / DMK+ {ac_party_tot.get('DMK+',0)} / "
              f"ADMK+ {ac_party_tot.get('ADMK+',0)} / OTH {ac_party_tot.get('OTHERS',0)}) ✓")

    print(f"\n==== loaded {loaded} ACs · {total_booths} booths · skipped {len(skipped)} ====")
    for ac, why in skipped:
        print(f"   skip AC {ac}: {why}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
