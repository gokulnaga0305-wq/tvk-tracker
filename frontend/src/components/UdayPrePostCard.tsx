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
import { ScrollText, AlertTriangle, Info } from 'lucide-react';

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

      {/* Honest tariff box */}
      <div className="rounded-md border border-amber-900/40 bg-amber-950/15 px-3 py-2.5 mb-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300/90 mb-1.5">
          <AlertTriangle size={12} /> Did electricity prices go up? Yes — be honest about it
        </div>
        <p className="text-[12px] text-gray-400 leading-relaxed">
          <span className="text-gray-300">Prices did rise under DMK.</span> UDAY (2017) required
          regular price revisions — but the previous government <span className="text-gray-300">froze prices for
          8 years (2014–2022)</span>, which is exactly why the debt exploded. DMK finally revised them in 2022
          and set an automatic yearly review (up to 6% each July) — while keeping
          <span className="text-gray-300"> 100 free units and free power for huts</span>. So the hikes are real;
          they are the <span className="text-gray-300">overdue correction of a freeze that caused the debt</span>,
          not a fresh burden invented out of nowhere.
        </p>
      </div>

      {/* Clarity note */}
      <div className="flex gap-2 text-[12px] text-gray-400 leading-relaxed mb-3">
        <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
        <span>
          One clarification people get wrong: the <span className="text-gray-300">“automatic 6% every July”</span> rule
          is from DMK’s 2022 tariff order — not a direct UDAY clause. UDAY only required <em>regular</em> revisions;
          the previous govt signed up for that in 2017 and then didn’t do it.
        </span>
      </div>

      <p className="text-[10px] text-gray-600">
        Sources: CAG Report No.7 of 2021 (TANGEDCO, pre/post UDAY) · UDAY MoU, 9 Jan 2017 (Power Ministry) ·
        TNERC tariff order 2022 · ICRA · Business Standard.
      </p>
    </section>
  );
}
