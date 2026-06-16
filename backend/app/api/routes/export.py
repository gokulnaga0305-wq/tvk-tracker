"""NotebookLM export — a single, always-current markdown digest of the verified
corpus, served at a public URL so NotebookLM (or any tool) can ingest it as a
source.

GET /api/export/notebooklm.md  →  text/markdown

It combines:
  - stable, sourced fact-checks (TASMAC, Power/EB, Investments),
  - live credit-steals (govt) + propaganda misattributions,
  - recently documented, VERIFIED TVK-era incidents.

Public + read-only (same data the dashboard already shows). Snapshot at fetch
time — re-import / refresh the source in NotebookLM to update.
"""
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import Response
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/export", tags=["export"])

SITE = "https://tvkfiles.vercel.app"

# Stable, sourced fact-checks (mirror the dashboard tabs / outreach packs).
STABLE = f"""## Key fact-checks (verified, stable)

### Does Tamil Nadu "run on" TASMAC / liquor money? — MISLEADING
- ₹48,344 cr (FY25) is TASMAC's SALES turnover, NOT government income.
- The treasury's real take (VAT + excise) ≈ ₹46,000 cr = ~25% of own-tax revenue,
  ~11% of the total state budget, ~1.5% of the economy (GSDP). Big, but not the engine.
- TN is mid-pack: UP, Karnataka, Uttarakhand lean on liquor MORE. Prohibition states
  (Bihar, Gujarat) earn ~₹0 and still see hooch deaths.
- The ₹10/bottle is a court-driven REFUNDABLE deposit (buyback), not a simple overcharge.
- Sources: PRS, RBI "State Finances", The Federal, CAG, Times of India. Full: {SITE}/tasmac

### EB bills under DMK: who decides the annual hike? — "DMK alone" is OVERSTATED
- First tariff hike in 8 years came Sep 2022 (TNERC Order 7/2022; ₹3 → ₹4.50/unit),
  ending a 2014–2022 freeze (most of it under AIADMK).
- 2023/24/25 hikes (2.18%, 4.83%, 3.16%) are AUTOMATIC, CPI-linked, set by the
  independent regulator TNERC — not a yearly DMK choice. The same mechanism now runs
  under TVK (July-2026 hike fires under the DMK-era order).
- 100 free units + free power for huts retained; domestic/MSME/agri shielded by subsidy.
- Sources: TNERC Order 7/2022, Mercom, DT Next, The South First. Full: {SITE}/power

### Tamil Nadu investment scorecard — MoU ≠ money delivered
- Flagship MoUs total ~₹2.98 lakh cr (a subset of GIM 2024's ₹6.64 lakh cr / 631 MoUs).
- Only ~₹27,000 cr (~9%) is OPERATIONAL on the ground; most is signed MoUs not yet built.
- Every commitment is source-linked; Mazagon Dock (₹15,000 cr) is at-risk (Andhra drift).
- Sources: company releases, PRS, GIM 2024 official list. Full: {SITE}/investments
"""


def _src(urls) -> str:
    """First two http(s) links as markdown citations."""
    links = [u for u in (urls or []) if isinstance(u, str) and u.startswith("http")][:2]
    if not links:
        return ""
    return " — " + " ".join(f"[source{'' if i == 0 else ' '+str(i+1)}]({u})"
                            for i, u in enumerate(links))


@router.get("/notebooklm.md")
async def notebooklm_export():
    db = get_db()
    floor = settings.govt_start_date.isoformat()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out: list[str] = []

    out.append(
        f"# TVK Files — verified corpus for NotebookLM\n\n"
        f"_Auto-generated {now} from {SITE}. A snapshot of the dashboard's VERIFIED data — "
        f"use it as a NotebookLM source and ask it to summarise/explain. Re-import to refresh._\n\n"
        f"**Grounding rule:** every claim here is sourced. Keep the even-handed framing "
        f"(it states counter-arguments too). Do not add any figure not present here."
    )
    out.append(STABLE)

    # --- Credit-steals (government claiming DMK-era credit) ---
    try:
        cs = (db.table("incidents")
              .select("title,summary,original_credit,source_urls,incident_date")
              .eq("is_credit_steal", True).eq("status", "approved")
              .order("incident_date", desc=True).limit(30).execute().data or [])
    except Exception:
        cs = []
    if cs:
        out.append("## Credit-steals — TVK claiming credit for DMK-era work")
        for r in cs:
            line = f"- **{r['title']}**"
            if r.get("original_credit"):
                line += f" — DMK precedent: {r['original_credit']}"
            line += _src(r.get("source_urls"))
            out.append(line)

    # --- Propaganda misattributions (debunked cards) ---
    try:
        pr = (db.table("propaganda_events")
              .select("title,description,debunk_source,source_urls,status,tags,propaganda_type")
              .order("first_seen", desc=True).limit(60).execute().data or [])
    except Exception:
        pr = []
    pr = [p for p in pr if (p.get("tags") and "credit_steal" in p["tags"])
          or p.get("propaganda_type") == "misattributed_event"]
    if pr:
        out.append("\n## Propaganda misattributions — fan/page cards crediting Vijay for others' actions")
        for p in pr:
            tag = "DEBUNKED" if p.get("status") == "debunked" else "under review"
            line = f"- **[{tag}] {p['title']}** — {(p.get('description') or '')[:400]}"
            if p.get("debunk_source"):
                line += f" (debunked by {p['debunk_source']})"
            line += _src(p.get("source_urls"))
            out.append(line)

    # --- Recent verified TVK-era incidents ---
    try:
        inc = (db.table("incidents")
               .select("title,summary,category,incident_date,location,source_urls,verification_status")
               .gte("incident_date", floor).eq("status", "approved")
               .in_("verification_status", ["multi_source_verified", "press_verified", "admin_verified"])
               .order("incident_date", desc=True).limit(50).execute().data or [])
    except Exception:
        inc = []
    if inc:
        out.append(f"\n## Recently documented incidents (TVK era, verified — since {floor})")
        for r in inc:
            loc = f" ({r['location']})" if r.get("location") else ""
            line = (f"- **{r['title']}**{loc} — {(r.get('summary') or '')[:300]}"
                    f" [{(r.get('incident_date') or '')[:10]}]{_src(r.get('source_urls'))}")
            out.append(line)

    out.append(f"\n---\n_Live dashboard: {SITE} · This digest reflects data at fetch time._")
    md = "\n".join(out)
    return Response(content=md, media_type="text/markdown; charset=utf-8")
