'use client';
/**
 * "UDAY — pre and post" card. Tells the CAG-documented story: the 2017 UDAY
 * rescue (signed by AIADMK) was meant to fix TANGEDCO's debt, but the debt
 * kept rising and CAG ruled it a failure — the real turnaround came later.
 *
 * Honesty rules baked in:
 *  - UDAY was signed by the PREVIOUS (AIADMK) govt, Jan 2017 — stated.
 *  - DMK DID raise tariffs (2022 + automatic annual) — stated plainly, not
 *    hidden, because the defensible point is "overdue correction", not denial.
 *  - The "automatic every-July hike" is a DMK-era (2022) mechanism, not a
 *    literal UDAY clause — stated.
 * Sources: CAG Report No.7 of 2021; UDAY MoU (9 Jan 2017); TNERC 2022 order.
 */
import { ScrollText, CheckCircle2 } from 'lucide-react';

interface Step { year: string; title: string; body: string; tone: 'neutral' | 'bad' | 'good' }

const STEPS: Step[] = [
  {
    year: '2015',
    title: 'Before UDAY',
    body: 'The power company already owed ₹81,312 cr.',
    tone: 'neutral',
  },
  {
    year: 'Jan 2017',
    title: 'Previous (AIADMK) govt signs UDAY',
    body: 'A central rescue scheme. The state took over 75% of the company’s ₹30,420 cr debt and promised to revise electricity prices regularly and turn the company around.',
    tone: 'neutral',
  },
  {
    year: '2017–2020',
    title: 'It didn’t work',
    body: 'Instead of falling, the debt ROSE to ₹1,23,896 cr by 2020. Prices stayed frozen, and the gap between cost and what people paid widened. The official auditor (CAG) ruled that UDAY had failed to turn the company around.',
    tone: 'bad',
  },
  {
    year: '2022 →',
    title: 'The real fix (DMK)',
    body: 'The first price revision in 8 years, plus a full restructuring — which cut the yearly loss by about 97% by 2024-25 and made the business operationally profitable.',
    tone: 'good',
  },
];

const DOT: Record<Step['tone'], string> = {
  neutral: 'bg-gray-500', bad: 'bg-red-500', good: 'bg-emerald-500',
};

// Approximate AVERAGE domestic rate (₹/unit). India uses slab pricing so
// these are indicative, not exact — but the ranking is solid. Sorted cheapest→priciest.
const STATE_RATES: { state: string; rate: number; kind: 'tn' | 'avg' | 'other'; note?: string }[] = [
  { state: 'Tamil Nadu',       rate: 5.8, kind: 'tn', note: '+ 100 units free' },
  { state: 'National average', rate: 7.2, kind: 'avg' },
  { state: 'Rajasthan',        rate: 7.9, kind: 'other' },
  { state: 'West Bengal',      rate: 8.1, kind: 'other' },
  { state: 'Maharashtra',      rate: 9.0, kind: 'other', note: 'up to ₹12' },
];
const RATE_MAX = 9;

export default function UdayPrePostCard() {
  return (
    <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 mb-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
        <ScrollText size={15} className="text-amber-400" />
        UDAY (2017): the rescue that didn’t rescue — until later
      </div>
      <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
        In 2017 the previous government signed a central scheme (UDAY) meant to fix the power
        company’s debt. Here is what actually happened, step by step.
      </p>

      {/* Timeline */}
      <div className="relative pl-5 mb-4">
        <div className="absolute left-[5px] top-1 bottom-1 w-px bg-[#2f2f2f]" />
        <div className="space-y-3.5">
          {STEPS.map((s, i) => (
            <div key={i} className="relative">
              <span className={`absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full ${DOT[s.tone]}`} />
              <div className="text-[11px] text-gray-500">{s.year}</div>
              <div className={`text-[13px] font-medium ${
                s.tone === 'bad' ? 'text-red-300' : s.tone === 'good' ? 'text-emerald-300' : 'text-gray-200'
              }`}>{s.title}</div>
              <div className="text-[12px] text-gray-400 leading-relaxed">{s.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Who sets the price + TN stays cheap */}
      <div className="rounded-md border border-emerald-800/40 bg-emerald-950/15 px-3 py-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300/90 mb-1.5">
          <CheckCircle2 size={12} /> Who sets the price — and is Tamil Nadu actually expensive?
        </div>
        <ul className="space-y-1.5 text-[12px] text-gray-400 leading-relaxed">
          <li className="flex gap-1.5"><span className="text-emerald-600/70">·</span><span>
            Electricity tariffs are set by the <span className="text-gray-300">independent regulator (TNERC)</span> under
            the Electricity Act 2003 — not fixed by the government directly. <span className="text-gray-300">Every state
            revises tariffs roughly every year</span> through its own regulator (Maharashtra, for example, raised
            industrial tariffs ~18%).
          </span></li>
          <li className="flex gap-1.5"><span className="text-emerald-600/70">·</span><span>
            After the 8-year freeze, TN&rsquo;s revisions resumed in 2022 — by <span className="text-gray-300">modest
            amounts (capped ~6% a year)</span>, far gentler than several other states.
          </span></li>
          <li className="flex gap-1.5"><span className="text-emerald-600/70">·</span><span>
            Even so, TN still has <span className="text-gray-300">among the cheapest power in India</span> — 100 free
            units, free farm power, and an average of about <span className="text-gray-300">₹5.8/unit</span>, well below
            West Bengal (₹8.1) or Rajasthan (₹7.9).
          </span></li>
        </ul>
      </div>

      {/* State price comparison bars */}
      <div className="rounded-md border border-[#2a2a2a] bg-[#141414] px-3 py-3 mb-3">
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2.5">
          Average home electricity rate (₹ per unit)
        </div>
        <div className="space-y-2">
          {STATE_RATES.map(s => {
            const pct = Math.round((s.rate / RATE_MAX) * 100);
            const bar = s.kind === 'tn' ? 'bg-emerald-500' : s.kind === 'avg' ? 'bg-gray-500' : 'bg-red-600/70';
            return (
              <div key={s.state} className="flex items-center gap-2.5">
                <span className={`w-24 text-[11px] shrink-0 ${s.kind === 'tn' ? 'text-emerald-300 font-medium' : 'text-gray-400'}`}>
                  {s.state}
                </span>
                <div className="flex-1 bg-[#0f0f0f] rounded h-5 overflow-hidden relative">
                  <div className={`h-full ${bar} rounded`} style={{ width: `${pct}%` }} />
                  <span className="absolute left-2 top-0 h-5 flex items-center text-[11px] font-semibold text-white">
                    ₹{s.rate.toFixed(1)}{s.note ? <span className="font-normal text-gray-300 ml-1.5">{s.note}</span> : null}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-600 mt-2.5">
          Indicative average domestic rate; India uses slab pricing so exact rates vary by usage. TN is the
          lowest here and far below the national average — before counting its 100 free units.
        </p>
      </div>

      <p className="text-[10px] text-gray-600">
        Sources: CAG Report No.7 of 2021 (TANGEDCO, pre/post UDAY) · UDAY MoU, 9 Jan 2017 (Power Ministry) ·
        Electricity Act 2003 / TNERC tariff orders · state-tariff comparison (SaurEnergy, Mercom) · ICRA.
      </p>
    </section>
  );
}
