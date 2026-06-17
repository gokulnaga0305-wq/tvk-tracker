'use client';
/**
 * Finance Scorecard — the HONEST "TN in 2021 (DMK takes office) vs 2026 (DMK
 * leaves)" comparison, sector by sector. Built to survive a fact-check:
 *   - It shows real improvement where it exists (economy doubled, per-capita
 *     income doubled, fastest-growing large state).
 *   - It CONCEDES the genuine concerns (own-tax effort, capex, interest).
 *   - It dismantles the EMOTIONAL framing (₹1,28,934 per-citizen debt) with
 *     the data the white paper leaves out — income grew faster than debt, and
 *     debt as a share of GSDP stayed flat.
 * Numbers cross-checked against the TVK 2026 white paper's own tables, PRS,
 * RBI Handbook of Statistics, MoSPI and the TN Economic Survey (sources below).
 */
import {
  Scale, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle,
  Info, Landmark, Wallet,
} from 'lucide-react';

// Twin growth: both GSDP and debt ~doubled, so the ratio barely moved.
// (₹ lakh crore. Debt = white paper Table 2.1; GSDP = MoSPI / RBI Handbook.)
const SERIES = [
  { y: '20-21', gsdp: 17.88, debt: 5.13 },
  { y: '21-22', gsdp: 20.72, debt: 5.96 },
  { y: '22-23', gsdp: 23.77, debt: 6.77 },
  { y: '23-24', gsdp: 26.89, debt: 7.58 },
  { y: '24-25', gsdp: 31.19, debt: 8.54 },
  { y: '25-26', gsdp: 35.29, debt: 10.0 },
];
const S_MAX = 36;

type Verdict = 'up' | 'flat' | 'concern';
const SECTORS: {
  sector: string; y2021: string; y2026: string; delta: string;
  verdict: Verdict; note: string; src: string;
}[] = [
  {
    sector: 'Economy size (GSDP)', y2021: '₹17.9 lakh cr', y2026: '₹35.3 lakh cr', delta: '+97%',
    verdict: 'up',
    note: 'Nearly doubled in 5 years. 2nd-largest state economy in India; the fastest-growing large state.',
    src: 'RBI Handbook of Statistics / MoSPI',
  },
  {
    sector: 'Real growth rate (avg/yr)', y2021: '5.2% (2016–21)', y2026: '9.1% (2021–26)', delta: '+3.9 pts',
    verdict: 'up',
    note: 'Growth accelerated. Two straight double-digit years (11.2%, 10.8%) vs the national ~7.4%.',
    src: 'TN Economic Survey 2025-26',
  },
  {
    sector: 'Per-capita income', y2021: '₹2.10 lakh', y2026: '₹4.08 lakh', delta: '+94%',
    verdict: 'up',
    note: 'Nearly doubled. 2nd highest among large states (after Karnataka); ~1.7× the national average.',
    src: 'MoSPI / TN Economic Survey',
  },
  {
    sector: 'Poverty (headcount)', y2021: '~4.9%', y2026: '~1.4%', delta: '↓ lowest tier',
    verdict: 'up',
    note: 'Among the lowest in India (national ~11.3%). 32 of 38 districts above the all-India income average.',
    src: 'NITI Aayog MPI / Economic Survey',
  },
  {
    sector: 'Debt-to-GSDP', y2021: '28.7%', y2026: '28.3%', delta: 'flat',
    verdict: 'flat',
    note: 'Stable as a share of the economy — NOT the "doubling" the headline implies. The economy doubled alongside the debt.',
    src: 'White Paper Table 2.1',
  },
  {
    sector: 'Per-capita debt', y2021: '₹77,819', y2026: '₹1,28,934', delta: '+66%',
    verdict: 'concern',
    note: 'Rose — but per-capita INCOME rose faster (+94%). Debt vs a citizen’s annual income actually held flat. (See the buster above.)',
    src: 'White Paper Table 2.4',
  },
  {
    sector: 'Revenue deficit (% GSDP)', y2021: '1.7%', y2026: '1.2% (Budget)', delta: 'narrowing',
    verdict: 'flat',
    note: 'On the official budget basis it is narrowing. The white paper’s higher 2.2% uses an unaudited "Pre-AC" figure.',
    src: 'PRS Budget Analysis 2025-26',
  },
  {
    sector: 'Own-tax effort (SoTR/GSDP)', y2021: '5.93%', y2026: '5.45%', delta: '−0.48 pt',
    verdict: 'concern',
    note: 'A genuine weak spot. But it’s a 15-year structural slide (8.94% back in 2006-07); GST removed most state tax levers after 2017.',
    src: 'White Paper / PRS',
  },
  {
    sector: 'Capital expenditure (/GSDP)', y2021: '1.79%', y2026: '1.44%', delta: '−0.35 pt',
    verdict: 'concern',
    note: 'Asset-building slipped as a share of GSDP (absolute capex still rose). A real thing to watch.',
    src: 'White Paper Table 5.3',
  },
  {
    sector: 'Power-sector PSUs (discom)', y2021: '~₹1.6 lakh cr', y2026: '~₹2.47 lakh cr', delta: 'rising',
    verdict: 'concern',
    note: 'TANGEDCO/TNPDCL debt + ~₹1.82 lakh cr accumulated losses are a genuine off-budget risk — though loss-making discoms are a nationwide problem, not a TN-only one.',
    src: 'White Paper Ch.7',
  },
  {
    sector: 'Welfare delivery', y2021: 'broad', y2026: 'broader', delta: '↑ coverage',
    verdict: 'up',
    note: 'Universal PDS, mid-day meals, free bus travel, Magalir Urimai ₹1,000 — the welfare engine behind TN’s human-development lead. Welfare is investment in people, not waste.',
    src: 'TN Budget / Policy Notes',
  },
  {
    sector: 'Industry & manufacturing', y2021: 'top tier', y2026: '#1 factories', delta: '↑ depth',
    verdict: 'up',
    note: 'TN has the most operating factories of any state and a top-tier manufacturing & exports base (autos, electronics — Apple/Foxconn). Industrial depth is rising.',
    src: 'Annual Survey of Industries / MoSPI',
  },
];

const verdictMeta: Record<Verdict, { label: string; cls: string; Icon: any; bar: string }> = {
  up:      { label: 'IMPROVED',        cls: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40', Icon: TrendingUp,   bar: 'border-emerald-800/40' },
  flat:    { label: 'STABLE',          cls: 'text-sky-400 bg-sky-950/30 border-sky-800/40',             Icon: Minus,        bar: 'border-sky-800/40' },
  concern: { label: 'GENUINE CONCERN', cls: 'text-amber-400 bg-amber-950/30 border-amber-800/40',       Icon: AlertTriangle, bar: 'border-amber-800/40' },
};

export default function FinanceScorecard() {
  const up = SECTORS.filter(s => s.verdict === 'up').length;
  const flat = SECTORS.filter(s => s.verdict === 'flat').length;
  const concern = SECTORS.filter(s => s.verdict === 'concern').length;

  // chart geometry
  const W = 640, H = 200, padL = 36, padR = 12, padT = 14, padB = 24;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i: number) => padL + (i / (SERIES.length - 1)) * iw;
  const yv = (v: number) => padT + ih - (v / S_MAX) * ih;
  const line = (k: 'gsdp' | 'debt') => SERIES.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yv(d[k]).toFixed(1)}`).join(' ');

  return (
    <div className="space-y-5">
      {/* Hero / thesis */}
      <section className="rounded-lg border border-sky-900/40 bg-sky-950/15 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-600 text-sky-50">THE HONEST SCORECARD</span>
          <span className="text-[11px] text-gray-500">TN in 2021 → 2026 · sector by sector</span>
        </div>
        <p className="text-[13.5px] text-gray-300 leading-relaxed">
          When DMK took office in 2021, was Tamil Nadu &ldquo;in crisis&rdquo;? When it left in 2026, did the state
          improve? This is the straight comparison — <span className="text-white">no spin, no denial.</span> The economy
          and incomes <span className="text-emerald-300">nearly doubled</span>; debt stayed <span className="text-sky-300">flat
          as a share of GSDP</span>; and a few <span className="text-amber-300">genuine concerns</span> remain. We show all three.
        </p>
        <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
          <span className="px-2 py-1 rounded border border-emerald-800/40 bg-emerald-950/30 text-emerald-300">{up} improved</span>
          <span className="px-2 py-1 rounded border border-sky-800/40 bg-sky-950/30 text-sky-300">{flat} stable</span>
          <span className="px-2 py-1 rounded border border-amber-800/40 bg-amber-950/30 text-amber-300">{concern} genuine concerns</span>
        </div>
      </section>

      {/* The per-capita debt buster — the emotional headline, dismantled */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <Wallet size={15} className="text-amber-400" /> &ldquo;₹1,28,934 of debt on every citizen&rsquo;s head&rdquo; — what it leaves out
        </div>
        <p className="text-[12px] text-gray-500 mb-4">
          The number is real. The framing is the trick: it never mentions that each citizen&rsquo;s <span className="text-gray-300">income
          rose faster than their share of the debt.</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-amber-800/40 bg-amber-950/15 px-4 py-4">
            <div className="text-[11px] text-gray-500 mb-1">Debt per citizen</div>
            <div className="text-sm text-gray-400">₹77,819 <span className="text-gray-600">→</span></div>
            <div className="text-2xl font-bold text-amber-300">₹1,28,934</div>
            <div className="text-[11px] text-amber-400/80 mt-1">+66% in 5 years</div>
          </div>
          <div className="rounded-md border border-emerald-800/40 bg-emerald-950/15 px-4 py-4">
            <div className="text-[11px] text-gray-500 mb-1">Income per citizen</div>
            <div className="text-sm text-gray-400">₹2.10 lakh <span className="text-gray-600">→</span></div>
            <div className="text-2xl font-bold text-emerald-300">₹4.08 lakh</div>
            <div className="text-[11px] text-emerald-400/80 mt-1">+94% — grew faster</div>
          </div>
        </div>
        <div className="rounded-md border border-emerald-800/40 bg-emerald-950/20 px-3 py-2.5 mt-4">
          <div className="flex gap-2 text-[13px] text-gray-200 leading-relaxed">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Because income outran debt, a citizen&rsquo;s debt share stayed at roughly <span className="text-white">a third of one year&rsquo;s
              income</span> — about the same as in 2021. And it isn&rsquo;t a bill anyone pays: it&rsquo;s the state&rsquo;s borrowing, serviced from
              its growing revenue, and it funded metro lines, roads, schools and hospitals. Even peer Karnataka carries ₹1.11 lakh per head.
            </span>
          </div>
        </div>
      </section>

      {/* Twin-growth chart: debt and GSDP both doubled → ratio flat */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <TrendingUp size={15} className="text-emerald-400" /> &ldquo;Debt almost DOUBLED&rdquo; — so did the economy
        </div>
        <p className="text-[12px] text-gray-500 mb-3">
          Both lines roughly doubled together (₹ lakh crore). That&rsquo;s why debt-to-GSDP barely moved: <span className="text-gray-300">28.7%
          → 28.3%.</span> Judging debt by rupees alone — instead of as a share of a bigger economy — is the core sleight of hand.
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="GSDP vs debt, both roughly doubling 2020-21 to 2025-26">
          {[0, 9, 18, 27, 36].map(v => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={yv(v)} y2={yv(v)} stroke="#262626" strokeWidth="1" />
              <text x={padL - 6} y={yv(v) + 3} textAnchor="end" fontSize="9" fill="#666">{v}</text>
            </g>
          ))}
          {SERIES.map((d, i) => (
            <text key={d.y} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#777">{d.y}</text>
          ))}
          <path d={line('gsdp')} fill="none" stroke="#34d399" strokeWidth="2.5" />
          <path d={line('debt')} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
          {SERIES.map((d, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={yv(d.gsdp)} r="3" fill="#34d399" />
              <circle cx={x(i)} cy={yv(d.debt)} r="3" fill="#f59e0b" />
            </g>
          ))}
        </svg>
        <div className="flex gap-4 mt-1 text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-300"><span className="w-3 h-[2px] bg-emerald-400 inline-block" /> GSDP (economy)</span>
          <span className="flex items-center gap-1.5 text-amber-300"><span className="w-3 h-[2px] bg-amber-400 inline-block" /> Outstanding debt</span>
        </div>
      </section>

      {/* Sector-by-sector scorecard */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
          <Scale size={15} className="text-sky-400" /> Sector by sector: 2021 → 2026
        </div>
        <div className="space-y-2.5">
          {SECTORS.map((s) => {
            const m = verdictMeta[s.verdict];
            return (
              <div key={s.sector} className={`rounded-md border ${m.bar} bg-[#141414] px-4 py-3`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[13px] font-medium text-gray-200">{s.sector}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${m.cls} flex items-center gap-1`}>
                    <m.Icon size={11} /> {m.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-[15px] text-gray-400">{s.y2021}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-[17px] font-bold text-white">{s.y2026}</span>
                  <span className="text-[11px] text-gray-500 ml-1">{s.delta}</span>
                </div>
                <p className="text-[12.5px] text-gray-400 leading-relaxed mt-1.5">{s.note}</p>
                <div className="text-[10.5px] text-gray-600 mt-1">Source: {s.src}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* What the white paper does to make it look worse */}
      <section className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
          <Info size={15} className="text-amber-400" /> How the 2026 white paper makes a stable picture look like a collapse
        </div>
        <ul className="space-y-2 text-[12.5px] text-gray-300">
          {[
            ['Absolutes, not ratios', 'It shouts "debt doubled to ₹10 lakh cr" and "₹1.28 lakh per head" — rupee figures that always rise with inflation and growth. The ratios (debt/GSDP, deficit/GSDP) barely moved.'],
            ['"Pre-AC" figures', 'It uses pre-actuals numbers that run higher than the audited Budget. PRS, on the budget basis, shows the revenue deficit NARROWING to 1.2%.'],
            ['Cherry-picked baseline', 'It starts the clock at 2021-22 to make the own-tax slide look new — while admitting elsewhere the peak was 8.94% back in 2006-07. The slide is 15 years old.'],
            ['Padded peer comparison', 'It folds off-budget PSU/guarantee liabilities into TN’s number, then compares that to peers’ narrow figures.'],
          ].map(([h, b]) => (
            <li key={h} className="flex gap-2">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span><span className="text-white font-medium">{h}:</span> {b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Honest bottom line */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
          <Landmark size={15} className="text-emerald-400" /> The honest bottom line
        </div>
        <p className="text-[13px] text-gray-300 leading-relaxed">
          Between 2021 and 2026, Tamil Nadu&rsquo;s economy became the <span className="text-white">fastest-growing large state</span>,
          GSDP and per-capita income <span className="text-emerald-300">nearly doubled</span>, and poverty stayed among India&rsquo;s lowest.
          Debt held <span className="text-sky-300">steady as a share of GSDP</span> and the revenue deficit is narrowing.
          Real concerns exist — <span className="text-amber-300">own-tax effort and capex slipped</span> — and they&rsquo;re worth fixing,
          but they&rsquo;re largely structural and national, not a unique collapse.
        </p>
        <p className="text-[13px] text-gray-300 leading-relaxed mt-2">
          So &ldquo;Tamil Nadu is drowning, ₹1.28 lakh on every head&rdquo; fails the data test — and so would &ldquo;everything is perfect.&rdquo;
          The truthful verdict: <span className="text-white">strong, broad-based growth on a stable-but-watch fiscal base.</span>
        </p>
      </section>

      {/* Sources */}
      <p className="text-[11px] text-gray-600 leading-relaxed px-1">
        Sources: TVK Govt White Paper on Fiscal Management of TN (Jun 2026, Tables 2.1, 2.4, 5.3); PRS Legislative
        Research — TN Budget Analysis 2025-26; RBI Handbook of Statistics on Indian States 2024-25; MoSPI; Tamil Nadu
        Economic Survey 2025-26. Per-capita debt vs income compared on a like-for-like current-price basis.
      </p>
    </div>
  );
}
