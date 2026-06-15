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
  Banknote, Skull, Receipt, PieChart, ClipboardCheck, XCircle, Store,
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

// Liquor's share at widening lenses — the "zoom out" debunk. The share
// shrinks from ~a quarter of what TN raises itself, to ~11% of the whole
// budget, to ~1.5% of the state's economy.
const ZOOMOUT = [
  { lens: 'of own-tax revenue', sub: 'money TN raises itself (~₹1.9 lakh cr)', pct: 25, color: '#e0524f' },
  { lens: 'of the total state budget', sub: 'all govt spending (₹4.39 lakh cr, 2025-26)', pct: 11, color: '#d99a3a' },
  { lens: "of Tamil Nadu's whole economy", sub: 'state GDP / GSDP (~₹31 lakh cr)', pct: 1.5, color: '#1d9e75' },
];

// Prohibition → illegal-liquor evidence.
const HOOCH = [
  { place: 'Bihar (dry since 2016)', toll: '150+', detail: "govt-admitted illicit-liquor deaths; Chhapra/Siwan Oct 2024 alone ~32" },
  { place: 'Gujarat (decades dry)', toll: '42 + ~150', detail: 'Botad 2022 (42) and Ahmedabad 2009 (~150) hooch tragedies' },
  { place: 'Tamil Nadu', toll: '~59', detail: 'Kallakurichi methanol arrack, June 2024 — even WITH legal TASMAC liquor' },
];

// The 717-closure accountability scorecard (June 2026).
const CLOSURE_DONE = [
  '717 shops shut near sensitive spots — 276 near temples, 186 near schools, 255 near bus stands.',
  'Closure stated permanent — the billing (POS) machines of all 717 outlets were disabled; "cannot reopen without a fresh policy decision" (TASMAC MD, 13 Jun 2026).',
  'Zone/district-wise details released (15 Jun 2026) — e.g. Thoothukudi 63, Trichy zone 84.',
];
const CLOSURE_GAP = [
  'No full shop-by-shop list with names and addresses yet — DMK published exactly that (named, by shop number) for its 2023 closures.',
  'Opposition (BJP’s Nainar Nagendran) was still demanding a "white paper" with district details + addresses on 11 Jun 2026.',
  'No Government Order (GO) number located for an itemised public list.',
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

      {/* ── Zoom out: share of the whole budget & economy ─────────── */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <PieChart size={15} className="text-sky-400" /> So what % of the whole budget &amp; economy is it really?
        </div>
        <p className="text-[12px] text-gray-500 mb-4">
          The honest test: zoom out from &ldquo;money TN raises itself&rdquo; to the full budget to the whole
          economy. The liquor share <span className="text-gray-300">shrinks fast</span> — which is the whole point.
        </p>
        <div className="space-y-3.5">
          {ZOOMOUT.map(z => (
            <div key={z.lens}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[12.5px] text-gray-300">
                  <span className="text-white font-semibold">{z.pct}%</span> {z.lens}
                </span>
                <span className="text-[10.5px] text-gray-600">{z.sub}</span>
              </div>
              <div className="bg-[#111] rounded h-4 overflow-hidden">
                <div className="h-full rounded flex items-center"
                     style={{ width: `${Math.max(z.pct, 1.2)}%`, background: z.color }}>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-sky-800/40 bg-sky-950/20 px-3 py-2.5 mt-4">
          <div className="flex gap-2 text-[13px] text-gray-200 leading-relaxed">
            <CheckCircle2 size={15} className="text-sky-400 shrink-0 mt-0.5" />
            <span>
              TASMAC is about <span className="text-white font-semibold">11% of the total state budget</span>
              {' '}(₹4.39 lakh cr of spending) and just <span className="text-white font-semibold">~1.5% of Tamil Nadu&rsquo;s
              ₹31 lakh-crore economy</span>. A meaningful slice — <span className="text-white">not the thing the state &ldquo;runs on.&rdquo;</span>
            </span>
          </div>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">
          Denominators: own-tax revenue ~₹1.9 lakh cr; total budget (2025-26 expenditure) ₹4,39,293 cr;
          GSDP 2024-25 ~₹31.2 lakh cr. Sources: PRS Legislative Research (TN Budget 2025-26), RBI / TN Economic Survey.
        </p>
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
          <Receipt size={15} className="text-amber-400" /> The extra ₹10 per bottle — it&rsquo;s a refundable deposit (with a catch)
        </div>
        <p className="text-[12px] text-gray-500 mb-3">
          Commonly misread as a simple &ldquo;overcharge.&rdquo; The honest version has two sides.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-md border border-emerald-800/40 bg-emerald-950/15 px-3 py-3">
            <div className="text-[11px] font-semibold text-emerald-300 mb-1.5">It&rsquo;s a deposit, refunded on return</div>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              Since 2025 the extra ₹10 is officially a <span className="text-gray-300">refundable deposit</span> — pay ₹10, bring the
              empty bottle back, get ₹10 returned (the minister called it a &ldquo;deposit,&rdquo; not a fee). It exists for a real reason:
              the <span className="text-gray-300">Madras High Court has, since ~2023, ordered TASMAC to buy back empties</span> so they
              can&rsquo;t be reused for spurious/illicit liquor. There&rsquo;s also a genuine shop running-cost angle (rent, EB bills,
              loadmen) — vendors aren&rsquo;t conventional govt servants.
            </p>
          </div>
          <div className="rounded-md border border-amber-900/40 bg-amber-950/15 px-3 py-3">
            <div className="text-[11px] font-semibold text-amber-300 mb-1.5">The catch: the refund often doesn&rsquo;t happen</div>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              In practice the buyback <span className="text-gray-300">failed to take off</span> — empties pile up, consumers find it
              cumbersome. In June 2026 the Madras HC <span className="text-gray-300">rapped TASMAC</span> — &ldquo;no licence to collect
              extra money from tipplers&rdquo; unless it&rsquo;s properly refunded — and set deadlines; TASMAC is now rolling out
              <span className="text-gray-300"> deposit-return machines</span> to automate refunds. So when the ₹10 isn&rsquo;t returned,
              it works like overcharging — which is exactly what the court is forcing TASMAC to fix.
            </p>
          </div>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">
          Separately, TASMAC has faced complaints/prosecutions for charging <span className="text-gray-500">above MRP</span> (9,319 cases, FY20) —
          a different issue from the deposit. The viral &ldquo;₹15 crore a day&rdquo; figure is an unaudited opposition extrapolation.
        </p>
      </section>

      {/* ── The 717 closures — accountability (June 2026) ──────────── */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <ClipboardCheck size={15} className="text-sky-400" /> The 717 shop closures — what&rsquo;s real (June 2026)
        </div>
        <p className="text-[12px] text-gray-500 mb-4">
          The TVK government closed 717 TASMAC shops near schools, temples and bus stands. Here&rsquo;s the honest
          scorecard — the step that was taken, and the gap that remains.
        </p>

        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="rounded-md border border-emerald-800/40 bg-emerald-950/15 px-3 py-3">
            <div className="text-[11px] font-semibold text-emerald-300 mb-2">What&rsquo;s actually done</div>
            <ul className="space-y-1.5">
              {CLOSURE_DONE.map((t, i) => (
                <li key={i} className="flex gap-1.5 text-[12px] text-gray-400 leading-relaxed">
                  <CheckCircle2 size={13} className="text-emerald-400/80 shrink-0 mt-0.5" /><span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-amber-900/40 bg-amber-950/15 px-3 py-3">
            <div className="text-[11px] font-semibold text-amber-300 mb-2">What&rsquo;s still missing</div>
            <ul className="space-y-1.5">
              {CLOSURE_GAP.map((t, i) => (
                <li key={i} className="flex gap-1.5 text-[12px] text-gray-400 leading-relaxed">
                  <XCircle size={13} className="text-amber-400/80 shrink-0 mt-0.5" /><span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-md border border-sky-800/40 bg-sky-950/20 px-3 py-2.5 mb-4">
          <div className="flex gap-2 text-[12.5px] text-gray-200 leading-relaxed">
            <Info size={15} className="text-sky-400 shrink-0 mt-0.5" />
            <span>
              <span className="text-sky-300 font-medium">Verdict on &ldquo;they published the list&rdquo;:</span> a real step —
              a zone/district breakdown is now public, more than the bare category-split of a week earlier — but it is
              <span className="text-white"> not yet the full address-level, shop-by-shop list</span> the public asked for.
              Credit the disclosure; don&rsquo;t overstate it as the complete list.
            </span>
          </div>
        </div>

        {/* The FL2/FL3 bars allegation */}
        <div className="rounded-md border border-[#262626] bg-[#141414] px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Store size={13} className="text-gray-400" />
            <span className="text-[11.5px] font-semibold text-gray-300">The allegation: &ldquo;closed 717 shops, but opening FL2/FL3 bars&rdquo;</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-amber-50 ml-auto">MISLEADING</span>
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-2">
            <span className="text-gray-300">FL2</span> = bars attached to TASMAC shops (run by private contractors who win them at auction);
            <span className="text-gray-300"> FL3</span> = star-hotel bars. There is <span className="text-gray-300">no evidence of NEW FL2/FL3 bars</span> being
            opened to offset the closures.
          </p>
          <p className="text-[12px] text-gray-400 leading-relaxed">
            <span className="text-gray-300">What&rsquo;s actually true:</span> the contract for the
            <span className="text-gray-300"> ~2,000 existing attached bars</span> expires 30 Jun 2026, so TASMAC is
            <span className="text-gray-300"> re-tendering</span> them — a routine renewal of <span className="text-gray-300">existing</span> bars, not new ones —
            and existing bars near the closed shops are profiting as drinkers redirect. The fair point is narrower than the
            allegation: the attached-bar ecosystem <span className="text-gray-300">continues</span>, so the &ldquo;dry&rdquo; optics are
            partly undercut — but that is <span className="text-white">continuation, not new bars.</span>
          </p>
        </div>

        <p className="text-[10px] text-gray-600 mt-2">
          Sources: closure confirmation & permanence — DT Next (13 Jun 2026), Daily Thanthi/Maalaimalar (5 Jun) ·
          zone/district list — Dinamalar, Daily Thanthi, News18 Tamil, Indian Express Tamil (15 Jun 2026) ·
          white-paper demand — Daily Thanthi/Maalaimalar (Nagendran, 11 Jun) · bar re-tender — Tamiljanam/Athiban (5 Jun) ·
          existing bars profiting — Vikatan, Coimbatore (21 May 2026). Largely Tamil-press; granularity read from headlines + the standing demand for an itemised list.
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
        VAT-vs-excise routing — RBI &ldquo;State Finances: A Study of Budgets&rdquo; ·
        ₹10 bottle-deposit & buyback / Madras HC orders — Times of India, New Indian Express, DT Next, ETV Bharat, The Hindu (2023–2026);
        above-MRP overcharge cases — The News Minute, dtnext ·
        budget size & GSDP — PRS Legislative Research (TN Budget 2025-26), RBI / TN Economic Survey ·
        hooch tragedies — Wikipedia, ETV Bharat, The Quint, The News Minute. Figures are best-available;
        the FY24 own-tax breakdown uses approximate liquor-VAT/fuel-VAT splits (the budget reports them on one line).
      </p>
    </div>
  );
}
