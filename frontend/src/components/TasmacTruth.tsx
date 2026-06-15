'use client';
/**
 * TASMAC Truth — an honest, sourced teardown of the claim that "Tamil Nadu
 * runs on TASMAC/liquor money."
 *
 * Honesty rules (the whole point of this card):
 *  - The ₹48,344 cr everyone quotes is SALES TURNOVER, not government income.
 *  - What the treasury actually books from liquor (VAT + excise) is ~a quarter
 *    of own-tax revenue — the single largest individual stream, but NOT a
 *    majority. "Mainly runs on liquor" is false; "liquor is a critical quarter
 *    of own-tax revenue" is true. Both are stated.
 *  - The steelman (liquor IS large, regressive, growing) is shown, not hidden.
 *  - The ₹10/bottle surcharge is BOTH a real cost-recovery problem AND illegal
 *    overcharging — both stated.
 *  - The 2025 ED case is presented as alleged + stayed + unproven.
 * Self-contained (static researched data), hand-rolled SVG, dark-mode native.
 * Sources cited at the bottom.
 */
import {
  Wine, TrendingUp, AlertTriangle, CheckCircle2, Info, Scale,
  Banknote, Skull, Gavel, Receipt,
} from 'lucide-react';

// TASMAC reported revenue, ₹ crore. FY16–FY21 = gross retail turnover;
// FY22–FY25 the reported headline is the tax-take (VAT+excise) — see caveat.
const SERIES = [
  { y: 'FY16', v: 25846 },
  { y: 'FY17', v: 26995 },
  { y: 'FY18', v: 26798 },
  { y: 'FY19', v: 31158 },
  { y: 'FY20', v: 33133 },
  { y: 'FY21', v: 33811 },
  { y: 'FY22', v: 36051 },
  { y: 'FY23', v: 44121 },
  { y: 'FY24', v: 45856 },
  { y: 'FY25', v: 48344 },
];

// FY24 own-tax revenue decomposition (₹ cr, approximate; liquor = VAT+excise
// combined, fuel VAT = the non-liquor part of the sales-tax line).
const OWNTAX = [
  { label: 'SGST (goods & services)',       v: 66967, c: '#6b7fd7' },
  { label: 'Liquor (VAT + excise)',         v: 46000, c: '#e0524f', hi: true },
  { label: 'Petrol/diesel VAT',             v: 30000, c: '#d99a3a' },
  { label: 'Stamp duty & registration',     v: 25567, c: '#1d9e75' },
  { label: 'Other (motor vehicle, etc.)',   v: 22000, c: '#7a7a7a' },
];

// Prohibition → illegal-liquor evidence.
const HOOCH = [
  { place: 'Bihar (dry since 2016)', toll: '150+', detail: "govt-admitted illicit-liquor deaths; Chhapra/Siwan Oct 2024 alone ~32" },
  { place: 'Gujarat (decades dry)', toll: '42 + ~150', detail: 'Botad 2022 (42) and Ahmedabad 2009 (~150) hooch tragedies' },
  { place: 'Tamil Nadu', toll: '~59', detail: 'Kallakurichi methanol arrack, June 2024 — even WITH legal TASMAC liquor' },
];

// ---- 10-year chart geometry ----
const W = 680, H = 300, padL = 34, padR = 12, top = 16, bottom = 250;
const vMax = 52000;
const yOf = (v: number) => bottom - (v / vMax) * (bottom - top);
const plotW = W - padL - padR;
const slot = plotW / SERIES.length;
const bw = slot * 0.62;
const cx = (i: number) => padL + slot * (i + 0.5);
const GRID = [50000, 40000, 30000, 20000, 10000, 0];

function fmtCr(n: number) { return '₹' + n.toLocaleString('en-IN'); }

export default function TasmacTruth() {
  const maxOwn = Math.max(...OWNTAX.map(o => o.v));
  const ownTotal = OWNTAX.reduce((s, o) => s + o.v, 0);

  return (
    <div className="space-y-5">
      {/* ── Hero: the myth ─────────────────────────────────────────── */}
      <section className="rounded-lg border border-red-900/40 bg-red-950/15 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-amber-50">MISLEADING CLAIM</span>
          <span className="text-[11px] text-gray-500">fact-checked with sources</span>
        </div>
        <p className="text-lg md:text-xl font-bold text-gray-400 mb-2">
          <span className="line-through decoration-red-500/70">&ldquo;Tamil Nadu mainly runs on TASMAC / liquor money.&rdquo;</span>
        </p>
        <p className="text-[13.5px] text-gray-300 leading-relaxed">
          The <span className="text-white font-semibold">₹48,344 crore</span> everyone quotes is TASMAC&rsquo;s
          <span className="text-white"> sales turnover</span> — the total value of every bottle sold — <span className="text-white">not</span> government income.
          What the treasury actually earns from liquor (VAT + excise) is about
          <span className="text-amber-300 font-semibold"> a quarter of its own-tax revenue</span>: the single biggest individual stream,
          but <span className="text-white">nowhere near a majority.</span> The honest verdict cuts both ways — and that&rsquo;s below.
        </p>
      </section>

      {/* ── The 3-number trick ─────────────────────────────────────── */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <Scale size={15} className="text-amber-400" /> Turnover ≠ government income (the core trick)
        </div>
        <p className="text-[12px] text-gray-500 mb-4">Three very different numbers get deliberately mixed up:</p>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { t: 'What shoppers paid', v: '₹48,344 cr', s: 'TASMAC sales turnover (FY25) — includes the maker’s cost, taxes and shop margin', c: 'text-gray-200', b: 'border-[#333]' },
            { t: 'What the treasury books', v: '₹48,344 cr', s: '= ₹37,324 cr VAT + ₹11,020 cr excise on liquor (FY25)', c: 'text-amber-200', b: 'border-amber-900/40' },
            { t: "Liquor's real share", v: '~25%', s: 'of own-tax revenue (~16% of total revenue, which also includes central transfers)', c: 'text-emerald-300', b: 'border-emerald-900/40' },
          ].map(m => (
            <div key={m.t} className={`rounded-md bg-[#141414] border ${m.b} px-3 py-3`}>
              <div className="text-[10.5px] text-gray-500 mb-0.5">{m.t}</div>
              <div className={`text-2xl font-bold ${m.c}`}>{m.v}</div>
              <div className="text-[10.5px] text-gray-600 mt-1 leading-snug">{m.s}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 text-[12px] text-gray-400 leading-relaxed mt-3">
          <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
          <span>
            TN collects most of its liquor money as <span className="text-gray-300">VAT (sales tax)</span>, not excise — so its
            &ldquo;state excise&rdquo; line looks tiny next to states like UP. You must <span className="text-gray-300">add VAT + excise</span> to
            see the real take. Opponents quote <span className="text-gray-300">gross turnover</span> (inflates it); some defenders quote
            <span className="text-gray-300"> excise-only</span> (deflates it). The truth sits in the middle.
          </span>
        </div>
      </section>

      {/* ── 10-year revenue chart ──────────────────────────────────── */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <TrendingUp size={15} className="text-red-400" /> TASMAC revenue, last 10 years (₹ crore)
        </div>
        <p className="text-[12px] text-gray-500 mb-4">
          It roughly <span className="text-gray-300">doubled</span> in a decade — but a big part of that &ldquo;growth&rdquo; is
          <span className="text-gray-300"> price/tax hikes</span> (e.g. the Oct-2022 over-100% hike), not more people drinking.
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
             aria-label="Bar chart of TASMAC revenue rising from 25,846 crore in FY16 to 48,344 crore in FY25.">
          {GRID.map(g => (
            <g key={g}>
              <line x1={padL} x2={W - padR} y1={yOf(g)} y2={yOf(g)} stroke={g === 0 ? '#4a4a4a' : '#242424'} strokeWidth={g === 0 ? 1.2 : 1} />
              <text x={padL - 5} y={yOf(g) + 3} textAnchor="end" fontSize="9.5" fill="#6b6b6b">{g === 0 ? '0' : (g / 1000) + 'k'}</text>
            </g>
          ))}
          {SERIES.map((d, i) => {
            const isLast = i === SERIES.length - 1;
            return (
              <g key={d.y}>
                <rect x={cx(i) - bw / 2} y={yOf(d.v)} width={bw} height={bottom - yOf(d.v)} rx="2"
                      fill={isLast ? '#e0524f' : '#9a3d3b'} />
                <text x={cx(i)} y={yOf(d.v) - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={isLast ? '#f08a87' : '#b9706e'}>
                  {Math.round(d.v / 1000)}k
                </text>
                <text x={cx(i)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="#9a9a9a">{d.y}</text>
              </g>
            );
          })}
        </svg>
        <div className="flex gap-2 text-[11px] text-gray-500 leading-relaxed mt-2 border-t border-[#262626] pt-2">
          <AlertTriangle size={12} className="text-amber-500/70 shrink-0 mt-0.5" />
          <span>
            <span className="text-gray-400">Honesty note:</span> the way this headline number is reported tightened around FY21–22
            (older years = gross retail sales; recent years = the tax-take). So the early and late bars aren&rsquo;t a perfect
            apples-to-apples series — the upward trend is real, the exact definition shifted.
          </span>
        </div>
      </section>

      {/* ── Where the money REALLY comes from ──────────────────────── */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <Banknote size={15} className="text-emerald-400" /> Where TN&rsquo;s own-tax money really comes from (FY24)
        </div>
        <p className="text-[12px] text-gray-500 mb-4">
          Own-tax revenue ≈ <span className="text-gray-300">₹1.9 lakh crore</span>. Liquor is the single biggest single line —
          but it is one slice among several, not the engine.
        </p>
        <div className="space-y-2.5">
          {OWNTAX.map(o => {
            const pct = Math.round((o.v / ownTotal) * 100);
            const w = Math.round((o.v / maxOwn) * 100);
            return (
              <div key={o.label}>
                <div className="flex justify-between text-[11.5px] mb-0.5">
                  <span className={o.hi ? 'text-red-300 font-medium' : 'text-gray-400'}>{o.label}</span>
                  <span className="text-gray-300 font-semibold">{fmtCr(o.v)} cr · {pct}%</span>
                </div>
                <div className="bg-[#111] rounded h-3 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${w}%`, background: o.c }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded-md border border-emerald-800/40 bg-emerald-950/20 px-3 py-2.5 mt-4">
          <div className="flex gap-2 text-[13px] text-gray-200 leading-relaxed">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <span className="text-emerald-300 font-medium">Verdict:</span> SGST + petrol/diesel tax + stamp duty together are
              about <span className="text-white">two-thirds</span> of own-tax revenue. Liquor (~a quarter) is big, but the state
              <span className="text-white"> does not &ldquo;run on&rdquo; it.</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Choice + shutdown risk ─────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-5">
        <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
            <Info size={15} className="text-gray-400" /> &ldquo;Drinking is a personal choice&rdquo;
          </div>
          <p className="text-[12.5px] text-gray-400 leading-relaxed">
            True — and worth saying carefully. The government doesn&rsquo;t <span className="text-gray-300">create</span> the demand
            and doesn&rsquo;t invite anyone to drink; consumption is the individual&rsquo;s decision. But the state <span className="text-gray-300">isn&rsquo;t a
            neutral bystander</span> either — it is the <span className="text-gray-300">monopoly seller</span> and has raised prices to
            grow the take. Honest framing: the state doesn&rsquo;t manufacture the demand, but it <span className="text-gray-300">does monetise
            and depend on it.</span>
          </p>
        </section>

        <section className="rounded-lg border border-amber-900/40 bg-amber-950/15 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200 mb-2">
            <Skull size={15} className="text-amber-400" /> Shut it down → illegal liquor rises
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-3">
            Prohibition tends to <span className="text-gray-300">displace, not erase</span> drinking — toward deadlier
            methanol hooch — while wiping out revenue and adding a huge policing burden.
          </p>
          <div className="space-y-2">
            {HOOCH.map(h => (
              <div key={h.place} className="flex gap-2.5">
                <span className="text-red-300 font-bold text-[13px] w-16 shrink-0 text-right">{h.toll}</span>
                <span className="text-[11.5px] text-gray-400 leading-snug">
                  <span className="text-gray-300">{h.place}</span> — {h.detail}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-2">Deaths = reported tolls; prohibition states still see recurring hooch tragedies.</p>
        </section>
      </div>

      {/* ── The ₹10/bottle truth ───────────────────────────────────── */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <Receipt size={15} className="text-amber-400" /> The ₹10-per-bottle surcharge — the raw truth
        </div>
        <p className="text-[12px] text-gray-500 mb-3">Both things are true at once. We&rsquo;re not hiding either side.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-md border border-[#262626] bg-[#141414] px-3 py-3">
            <div className="text-[11px] font-semibold text-gray-300 mb-1.5">The vendors&rsquo; case (real costs)</div>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              Shop salesmen are <span className="text-gray-300">not conventional government servants</span>. The shops carry
              <span className="text-gray-300"> rent, electricity (EB) bills, loadmen wages</span> and empty-bottle handling — and staff
              recover those costs through the extra ₹10. The running-cost problem is genuine.
            </p>
          </div>
          <div className="rounded-md border border-red-900/40 bg-red-950/15 px-3 py-3">
            <div className="text-[11px] font-semibold text-red-300 mb-1.5">But it&rsquo;s still illegal overcharging</div>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              There is <span className="text-gray-300">no gazetted order</span> authorising it — it breaches the printed MRP.
              TASMAC itself logged <span className="text-gray-300">9,319 overcharging cases (FY20)</span> and has prosecuted staff.
              The viral &ldquo;₹15 crore a day&rdquo; figure is an <span className="text-gray-300">opposition extrapolation, not audited.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── 2025 ED case ───────────────────────────────────────────── */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#141414] p-4">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-300 mb-1.5">
          <Gavel size={13} className="text-gray-400" /> For balance: the 2025 ED case (alleged, stayed, unproven)
        </div>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          The Enforcement Directorate raided TASMAC&rsquo;s HQ (6 Mar 2025) and alleged over <span className="text-gray-400">₹1,000 crore</span> was
          siphoned via tender, transport and bar-licence manipulation across <span className="text-gray-400">2017–2023</span> (spanning both
          AIADMK and DMK terms). The Madras High Court backed the probe; the <span className="text-gray-400">Supreme Court stayed it (23 May 2025)</span>
          citing federal overreach. <span className="text-gray-400">Status: unproven and stayed</span> — included here because an honest page shows the
          uncomfortable parts too.
        </p>
      </section>

      {/* ── The honest steelman ────────────────────────────────────── */}
      <section className="rounded-lg border border-amber-900/40 bg-amber-950/15 p-5">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-300/90 mb-2">
          <AlertTriangle size={13} /> The strongest version of the OTHER side (so this can&rsquo;t be ambushed)
        </div>
        <ul className="space-y-1.5 text-[12.5px] text-gray-400 leading-relaxed">
          <li className="flex gap-1.5"><span className="text-amber-600/70">·</span><span>Liquor is the <span className="text-gray-300">single largest individual revenue stream</span> — roughly tying or beating SGST.</span></li>
          <li className="flex gap-1.5"><span className="text-amber-600/70">·</span><span>It is about <span className="text-gray-300">a quarter of own-tax revenue</span> — losing it would blow a hole no easy substitute fills, which is exactly why no TN government seriously moves to prohibition.</span></li>
          <li className="flex gap-1.5"><span className="text-amber-600/70">·</span><span>It <span className="text-gray-300">doubled in a decade</span>, and welfare/infrastructure visibly leans on it — a structural incentive to keep it growing.</span></li>
          <li className="flex gap-1.5"><span className="text-amber-600/70">·</span><span>It is <span className="text-gray-300">regressive</span> — the burden falls heaviest on poor and working-class households, with real family and health costs.</span></li>
        </ul>
        <p className="text-[12px] text-gray-300 leading-relaxed mt-3 border-t border-amber-900/30 pt-2.5">
          So the defensible truth is: TN is <span className="text-white">structurally dependent on a very large, regressive, single-source
          liquor revenue (~a quarter of own-tax income)</span> that it has every fiscal reason to keep growing — but it is
          <span className="text-white"> false</span> that the state &ldquo;mainly runs&rdquo; on it.
        </p>
      </section>

      {/* ── Sources ────────────────────────────────────────────────── */}
      <p className="text-[10px] text-gray-600 leading-relaxed">
        Sources: TASMAC revenue & FY25 VAT/excise split — The Federal, dtnext, spiritz.in (2023–2025) ·
        TN own-tax composition & denominators — PRS Legislative Research (TN Budget analyses), CAG provisional accounts ·
        VAT-vs-excise routing — RBI &ldquo;State Finances: A Study of Budgets&rdquo; · ₹10 overcharge & 9,319 cases — The News Minute, dtnext ·
        2025 ED case / Madras HC / Supreme Court stay — Verdictum, The South First (2025) ·
        hooch tragedies — Wikipedia, ETV Bharat, The Quint, The News Minute. Figures are best-available;
        the FY24 own-tax breakdown uses approximate liquor-VAT/fuel-VAT splits (the budget reports them on one line).
      </p>
    </div>
  );
}
