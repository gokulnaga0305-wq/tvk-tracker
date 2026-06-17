'use client';
/**
 * White Paper Debunk — fact-checks the TVK government's 16 Jun 2026 white paper
 * on Tamil Nadu's finances. Honest by design: it CONCEDES the white paper's
 * valid points (interest burden, revenue deficit, guarantees) and debunks the
 * MISLEADING framing (inflated debt ratio, apples-to-oranges state comparison,
 * overstated deficits, "DMK emptied the treasury" ignoring inherited debt).
 * Sources cited in the footer.
 */
import {
  ScrollText, AlertTriangle, CheckCircle2, Info, Scale, Landmark, TrendingUp,
} from 'lucide-react';

// The honest debt comparison (the infographic's centrepiece): absolute debt
// doubled, but GSDP doubled too — so the RATIO held/fell and stays within limit.
const COMPARE = {
  prev: { label: 'AIADMK (left office 2021)', debt: '₹5 lakh cr', ratio: 29, gsdp: '₹17 lakh cr' },
  now:  { label: 'DMK (2025-26)',             debt: '₹10 lakh cr', ratio: 28, gsdp: '₹36 lakh cr' },
};

// Debt as % of GSDP across big states (PRS / RBI) — TN is among the better.
const STATE_DEBT = [
  { s: 'Punjab', v: 46 },
  { s: 'West Bengal', v: 37 },
  { s: 'Kerala', v: 36 },
  { s: 'Rajasthan', v: 35 },
  { s: 'Andhra Pradesh', v: 33 },
  { s: 'All-states avg', v: 28 },
  { s: 'Tamil Nadu', v: 26, hi: true },
];
const SD_MAX = 50;

const FAIR = [
  'Interest payments are genuinely high — ~₹67,000 cr ≈ 22% of revenue receipts (~2× the prudential norm, now above annual capex).',
  'TN runs a persistent revenue deficit — it borrows partly for day-to-day spending. Real structural weak spot.',
  'Absolute debt did roughly double to ~₹10 lakh cr — true in rupee terms.',
  'Government guarantees + TANGEDCO liabilities are large and growing — true.',
];

const MISLEADING = [
  ['Debt-to-GSDP “28.3%”', 'The standard figure (PRS, from the budget) is ~26% and DECLINING — within the statutory limit. The 28.3% folds in off-budget/PSU liabilities, then compares that padded number to other states’ NARROW numbers. Apples-to-oranges.'],
  ['Deficits “highest ever” (3.77% / 2.22%)', 'PRS puts the fiscal deficit AT the 3% FRBM target and the revenue deficit at 1.2% and NARROWING (was 1.7%). The “record” magnitudes don’t match the audited-budget basis, and the improving trend is hidden.'],
  ['“Debt doubled”', 'GSDP also doubled (~₹17 → ~₹36 lakh cr). So the ratio didn’t worsen. Judge debt by the GSDP %, which is within Finance Commission limits.'],
  ['“DMK emptied the treasury”', 'No audited basis (accounts are CAG-audited). Much debt was INHERITED — the 20% line was crossed in 2016-17 under AIADMK, the steepest jump was COVID 2020-21, and UDAY power-debt was signed by AIADMK in Jan 2017.'],
  ['“Corruption in tax departments”', 'Asserted with zero evidence.'],
];

export default function WhitePaperDebunk() {
  const maxSD = Math.max(...STATE_DEBT.map(s => s.v));
  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="rounded-lg border border-amber-900/40 bg-amber-950/15 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-amber-50">POLITICAL, NOT A NEUTRAL AUDIT</span>
          <span className="text-[11px] text-gray-500">fact-checked · 16 Jun 2026 white paper</span>
        </div>
        <p className="text-[13.5px] text-gray-300 leading-relaxed">
          The TVK government’s white paper on TN finances (FM N. Marie Wilson, 16 Jun 2026) flags some
          <span className="text-white"> real issues</span> — but frames them with <span className="text-white">scary absolute
          numbers, an inflated debt ratio compared unfairly to other states, and a “DMK emptied the treasury” narrative</span>
          that buries how much debt was inherited and that the key ratios held or improved. We concede what’s true and debunk the spin.
        </p>
      </section>

      {/* The honest comparison — infographic centrepiece */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <Scale size={15} className="text-emerald-400" /> Compare government to government (honestly)
        </div>
        <p className="text-[12px] text-gray-500 mb-4">
          Debt doubled in rupees — but so did the economy. The right yardstick is debt <span className="text-gray-300">as a % of GSDP.</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[COMPARE.prev, COMPARE.now].map((c, i) => (
            <div key={i} className={`rounded-md border px-4 py-4 ${i === 1 ? 'border-emerald-800/40 bg-emerald-950/15' : 'border-[#262626] bg-[#141414]'}`}>
              <div className="text-[11px] text-gray-500 mb-2">{c.label}</div>
              <div className="text-2xl font-bold text-gray-200">{c.debt}</div>
              <div className="text-[11px] text-gray-500 mb-2">total debt</div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold ${i === 1 ? 'text-emerald-300' : 'text-gray-300'}`}>{c.ratio}%</span>
                <span className="text-[11px] text-gray-500">of GSDP</span>
              </div>
              <div className="text-[11px] text-gray-600 mt-1">GSDP {c.gsdp}</div>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-emerald-800/40 bg-emerald-950/20 px-3 py-2.5 mt-4">
          <div className="flex gap-2 text-[13px] text-gray-200 leading-relaxed">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>The economy <span className="text-white font-semibold">doubled</span> (₹17 → ₹36 lakh cr), so the debt ratio actually
              <span className="text-white font-semibold"> fell (29% → 28%)</span> — and stays <span className="text-white">within the ~30% statutory limit.</span></span>
          </div>
        </div>
        {/* salary analogy */}
        <div className="rounded-md border border-[#262626] bg-[#141414] px-3 py-3 mt-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-300 mb-1.5">
            <Info size={12} className="text-sky-400" /> The simple way to think about it
          </div>
          <p className="text-[12.5px] text-gray-400 leading-relaxed">
            Who has “less” debt — a person earning <span className="text-gray-300">₹50,000 with a ₹5,000 loan</span>, or one earning
            <span className="text-gray-300"> ₹1,00,000 with a ₹7,000 loan?</span> The second owes more in rupees but far less relative to income.
            <span className="text-gray-300"> That’s why you judge a state’s debt against its GSDP, not the raw number.</span>
          </p>
        </div>
      </section>

      {/* State comparison */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <TrendingUp size={15} className="text-violet-400" /> Debt as % of GSDP — TN vs other big states
        </div>
        <p className="text-[12px] text-gray-500 mb-4">On a like-for-like basis, TN is among the <span className="text-gray-300">better-managed</span> large states.</p>
        <div className="space-y-1.5">
          {STATE_DEBT.map(r => (
            <div key={r.s} className="flex items-center gap-2">
              <span className={`w-28 shrink-0 text-[11px] ${r.hi ? 'text-emerald-300 font-semibold' : 'text-gray-400'}`}>{r.s}</span>
              <div className="flex-1 bg-[#111] rounded h-4 overflow-hidden">
                <div className="h-full rounded" style={{ width: `${(r.v / SD_MAX) * 100}%`, background: r.hi ? '#1d9e75' : '#9a3d3b' }} />
              </div>
              <span className={`w-10 shrink-0 text-[11px] text-right ${r.hi ? 'text-emerald-300 font-semibold' : 'text-gray-500'}`}>{r.v}%</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-2">Approximate FY25 figures (PRS / RBI). The ~30% line is the broad statutory comfort zone.</p>
      </section>

      {/* What's fair (concede) */}
      <section className="rounded-lg border border-emerald-800/40 bg-emerald-950/12 p-5">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-300 mb-2">
          <CheckCircle2 size={13} /> What’s FAIR in the white paper (we concede this)
        </div>
        <ul className="space-y-1.5 text-[12.5px] text-gray-400 leading-relaxed">
          {FAIR.map((t, i) => (
            <li key={i} className="flex gap-1.5"><span className="text-emerald-600/70">·</span><span>{t}</span></li>
          ))}
        </ul>
      </section>

      {/* What's misleading (debunk) */}
      <section className="rounded-lg border border-amber-900/40 bg-amber-950/12 p-5">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-300 mb-3">
          <AlertTriangle size={13} /> What’s MISLEADING (the spin)
        </div>
        <div className="space-y-3">
          {MISLEADING.map(([claim, rebut], i) => (
            <div key={i} className="rounded-md border border-[#262626] bg-[#141414] px-3 py-2.5">
              <div className="text-[12px] font-semibold text-amber-200/90 mb-0.5">{claim}</div>
              <div className="text-[12px] text-gray-400 leading-relaxed">{rebut}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The %-of-GSDP trick */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <Info size={15} className="text-rose-400" /> The “revenue fell as % of GSDP” trick
        </div>
        <p className="text-[12px] text-gray-500 mb-3">
          The white paper says own-tax revenue “fell to 5.45% of GSDP” — implying revenue dropped. It’s a
          <span className="text-gray-300"> mathematical artifact</span>, and the paper even contradicts itself (it says revenue <span className="text-gray-300">rose</span> elsewhere).
        </p>
        <div className="rounded-md border border-[#262626] bg-[#141414] px-3 py-3 text-[12.5px] text-gray-400 leading-relaxed">
          If revenue is <span className="text-gray-300">₹20</span> on a GSDP of <span className="text-gray-300">₹100</span> = <span className="text-gray-300">20%</span>.
          Now the economy grows: revenue <span className="text-emerald-300">rises to ₹25</span> but GSDP rises faster to <span className="text-gray-300">₹150</span> →
          that’s <span className="text-amber-300">16%</span>. Revenue <span className="text-white">went up</span>, yet the % “fell.” When GSDP grows faster than
          revenue, the ratio drops <span className="text-white">even though collections rose.</span> A class-8 student can see this — the white paper missed it.
        </div>
      </section>

      {/* Why the debt grew — verified context the white paper omits */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#141414] p-4">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-300 mb-2">
          <Landmark size={13} className="text-gray-400" /> Why the debt grew — context the white paper omits (and capex ≠ waste)
        </div>
        <ul className="space-y-1.5 text-[12px] text-gray-400 leading-relaxed">
          <li className="flex gap-1.5"><span className="text-gray-600">·</span><span><span className="text-gray-300">Chennai Metro Phase II:</span> the Centre delayed approval from 2019 to Oct 2024 — TN built it meanwhile, spending ~₹11,762 cr of <span className="text-gray-300">state funds</span> (of ₹18,564 cr) before the Centre released a single rupee.</span></li>
          <li className="flex gap-1.5"><span className="text-gray-600">·</span><span><span className="text-gray-300">GST shortfall (2020):</span> the Union FM told states to BORROW to cover delayed GST dues (the “Act of God” 41st GST Council) — debt pushed onto states.</span></li>
          <li className="flex gap-1.5"><span className="text-gray-600">·</span><span><span className="text-gray-300">GST is a destination/consumption tax:</span> a high-manufacturing state like TN loses revenue to consuming states — and the 5-year compensation guarantee <span className="text-gray-300">expired in 2022</span>, so it bites harder now.</span></li>
          <li className="flex gap-1.5"><span className="text-gray-600">·</span><span><span className="text-gray-300">Devolution:</span> TN gets ~4.1% of central tax devolution (15th Finance Commission) despite being <span className="text-gray-300">~9% of India’s GDP</span> — about half its economic weight.</span></li>
          <li className="flex gap-1.5"><span className="text-gray-600">·</span><span><span className="text-gray-300">COVID + health:</span> lockdowns cut revenue and health costs spiked — both in the DMK years.</span></li>
          <li className="flex gap-1.5"><span className="text-gray-600">·</span><span><span className="text-gray-300">Capital expenditure</span> (metro, modern buses, schools, infrastructure) is <span className="text-gray-300">investment with a return</span> — not “wasteful” borrowing. Judging capex as pure debt ignores the ROI.</span></li>
        </ul>
        <p className="text-[11.5px] text-gray-500 mt-2.5 leading-relaxed border-t border-[#262626] pt-2">
          Much of the debt was also <span className="text-gray-400">inherited</span> (20% line crossed under AIADMK in 2016-17; UDAY power-debt signed by AIADMK Jan 2017; steepest jump in COVID 2020-21).
          DMK’s rebuttal — Thennarasu: <span className="text-gray-400">“an empty paper, not a white paper”</span>; Saravanan: <span className="text-gray-400">“judge by the GSDP ratio — within Finance Commission limits.”</span>
        </p>
      </section>

      {/* Bottom line */}
      <section className="rounded-lg border border-sky-800/40 bg-sky-950/15 p-5">
        <div className="flex gap-2 text-[13px] text-gray-200 leading-relaxed">
          <Scale size={15} className="text-sky-400 shrink-0 mt-0.5" />
          <span>
            <span className="text-white font-semibold">Bottom line:</span> Tamil Nadu is a rich, fast-growing economy (~9% of India’s GDP)
            that is fiscally <span className="text-white">middling-to-stretched</span> — the kind of state that can safely carry large absolute
            debt. The white paper’s <span className="text-white">facts</span> (interest, revenue deficit, guarantees) point to real issues worth
            fixing. Its <span className="text-white">framing</span> — padded ratios, unfair comparisons, overstated deficits, and an
            “emptied the treasury” story that ignores inherited debt — is a <span className="text-white">political document, not a neutral audit.</span>
          </span>
        </div>
      </section>

      <p className="text-[10px] text-gray-600 leading-relaxed">
        Sources: White paper coverage — ThePrint/PTI, The Federal, The South First, India TV, Deccan Herald (16 Jun 2026) ·
        Authoritative fiscal data — PRS Legislative Research (TN Budget 2025-26: fiscal deficit 3.0%, revenue deficit 1.2%, debt ~26% GSDP),
        16th Finance Commission TN study (CAG-based), RBI &ldquo;State Finances&rdquo;, NITI Fiscal Health Index 2025 · UDAY under AIADMK — PIB (Jan 2017) ·
        DMK rebuttal — DT Next, ThePrint (16 Jun 2026) · Chennai Metro Phase II delay — PIB (Oct 2024), ThePrint, Deccan Herald ·
        GST &ldquo;borrow to manage&rdquo; (41st GST Council) — PIB (Oct 2020) · GST destination-tax — CBIC, IIM-A · TN devolution ~4.1% vs ~9% of GDP — PRS (15th FC).
        Debt-to-GSDP varies ~26–28% by definition; the directional finding (within limits, flat-to-declining, inherited) is robust.
      </p>
    </div>
  );
}
