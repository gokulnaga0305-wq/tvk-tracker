'use client';
/**
 * TANGEDCO turnaround card — plain-English, audited-figure version of the
 * "power company turnaround" story, built to replace the misleading viral
 * graphic that labelled OPERATING profit as NET profit.
 *
 * Honesty rules baked into the copy:
 *  - the yearly loss shrank ~97% (audited net figures) — TRUE
 *  - the business turned profitable (operating +2,073 cr) — TRUE
 *  - it is NOT yet net-profitable (FY25 still −437 cr) — stated plainly
 *  - ~1.62 lakh cr legacy debt remains — stated plainly
 * Static, sourced data (TNPDCL Annual Report 2024-25, ICRA, CAG, DT Next).
 */
import { TrendingDown, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface YearLoss { year: string; loss: number; label: string }

// Audited NET profit/(loss), ₹ crore. Negative = loss.
const YEARS: YearLoss[] = [
  { year: '2021-22', loss: 12995, label: '₹12,995 cr lost' },
  { year: '2022-23', loss: 10868, label: '₹10,868 cr lost' },
  { year: '2023-24', loss: 4436,  label: '₹4,436 cr lost' },
  { year: '2024-25', loss: 437,   label: '₹437 cr lost' },
];

const MAX = 12995;

export default function TangedcoTurnaround() {
  return (
    <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 mb-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
        <TrendingDown size={15} className="text-emerald-400" />
        The power company: from heavy losses to almost break-even
      </div>
      <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
        TANGEDCO — the state electricity company — used to lose thousands of crores
        every single year. Under the DMK government, that yearly loss almost disappeared.
      </p>

      {/* Yearly loss bars — shrinking */}
      <div className="space-y-2 mb-4">
        {YEARS.map(y => {
          const pct = Math.max(3, Math.round((y.loss / MAX) * 100));
          const last = y.year === '2024-25';
          return (
            <div key={y.year} className="flex items-center gap-3">
              <span className="w-16 text-[11px] text-gray-500 shrink-0">{y.year}</span>
              <div className="flex-1 bg-[#111] rounded h-6 overflow-hidden relative">
                <div
                  className={`h-full rounded ${last ? 'bg-emerald-600/70' : 'bg-red-600/70'}`}
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute left-2 top-0 h-6 flex items-center text-[11px] font-semibold text-white">
                  {y.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-500 mb-4">
        The yearly loss fell from <span className="text-red-300">₹12,995 cr</span> to just
        <span className="text-emerald-300"> ₹437 cr</span> — down nearly <span className="text-white font-semibold">97%</span> in four years.
      </p>

      {/* The good news — plain */}
      <div className="rounded-md border border-emerald-800/40 bg-emerald-950/20 px-3 py-2.5 mb-2.5">
        <div className="flex gap-2 text-[13px] text-gray-200 leading-relaxed">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>
            In 2024-25 the company actually <span className="text-emerald-300 font-medium">earned a profit of ₹2,073 cr</span> from
            running the business. The only reason the final number is still slightly negative is the
            interest it pays on <span className="text-gray-300">old loans piled up over many earlier years</span>.
          </span>
        </div>
      </div>

      {/* The honest part — plain */}
      <div className="rounded-md border border-amber-900/40 bg-amber-950/15 px-3 py-2.5 mb-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300/90 mb-1.5">
          <AlertTriangle size={12} /> The honest part (so no one can twist it)
        </div>
        <ul className="space-y-1 text-[12px] text-gray-400 leading-relaxed">
          <li className="flex gap-1.5"><span className="text-amber-600/70">·</span><span>It is <span className="text-gray-300">not fully in profit yet</span> — 2024-25 still ended ₹437 cr in the red.</span></li>
          <li className="flex gap-1.5"><span className="text-amber-600/70">·</span><span>It still carries about <span className="text-gray-300">₹1.62 lakh crore of old debt</span> built up over many years.</span></li>
          <li className="flex gap-1.5"><span className="text-amber-600/70">·</span><span>Part of the improvement came from the <span className="text-gray-300">state paying its share on time</span>, not the company alone.</span></li>
        </ul>
      </div>

      {/* Why it changed — plain */}
      <div className="flex gap-2 text-[12px] text-gray-400 leading-relaxed mb-3">
        <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
        <span>
          <span className="text-gray-300">Why it improved:</span> electricity prices had not been
          raised for 8 years (2014 to 2022). The DMK government finally revised them in 2022 and
          reorganised the company — while still keeping <span className="text-gray-300">100 free units and free power for huts</span>.
        </span>
      </div>

      <p className="text-[10px] text-gray-600">
        Figures are audited. Source: TNPDCL Annual Report 2024-25 · ICRA · CAG · DT Next.
      </p>
    </section>
  );
}
