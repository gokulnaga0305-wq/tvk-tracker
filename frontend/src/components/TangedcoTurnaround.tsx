'use client';
/**
 * TANGEDCO turnaround card — plain-English, audited-figure version of the
 * "power company turnaround" story, built to replace the misleading viral
 * graphic that labelled OPERATING profit as NET profit.
 *
 * Honest copy rules:
 *  - yearly loss shrank ~97% (audited net figures) — TRUE
 *  - the business turned profitable (operating +2,073 cr FY25) — TRUE
 *  - NOT yet net-profitable (FY25 still −437 cr) — stated plainly
 *  - ~1.62 lakh cr legacy debt remains — stated plainly
 * Chart is hand-rolled SVG (no charting dep, dark-mode native).
 * Source: TNPDCL Annual Report 2024-25, ICRA, CAG, DT Next.
 */
import { TrendingDown, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

// Audited net profit/(loss), ₹ crore (negative = loss).
const NET = [
  { y: 'FY22', v: -12995 },
  { y: 'FY23', v: -10868 },
  { y: 'FY24', v: -4436 },
  { y: 'FY25', v: -437 },
];
const OP_FY25 = 2073; // money made from running the business (before interest)

// ---- chart geometry ----
const W = 680, H = 330, padL = 30, padR = 14, top = 14, bottom = 286;
const vMax = 2600, vMin = -13600;
const yOf = (v: number) => bottom - ((v - vMin) / (vMax - vMin)) * (bottom - top);
const yZero = yOf(0);
const plotW = W - padL - padR;
const slot = plotW / 4;
const cx = (i: number) => padL + slot * (i + 0.5);
const inr = (n: number) => (n < 0 ? '−₹' : '+₹') + Math.abs(n).toLocaleString('en-IN');
const GRID = [2000, 0, -4000, -8000, -12000];

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

      {/* Simple summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        {[
          { t: 'Loss in 2024-25', v: '₹437 cr', s: 'down from ₹12,995 cr', c: 'text-red-300' },
          { t: 'Loss cut by', v: '~97%', s: 'in four years under DMK', c: 'text-white' },
          { t: 'Made from running it', v: '+₹2,073 cr', s: 'before old-loan interest', c: 'text-emerald-300' },
          { t: 'Old debt still left', v: '₹1.62 lakh cr', s: 'piled up over the years', c: 'text-amber-200/90' },
        ].map(m => (
          <div key={m.t} className="rounded-md bg-[#141414] border border-[#262626] px-3 py-2">
            <div className="text-[10.5px] text-gray-500">{m.t}</div>
            <div className={`text-lg font-bold ${m.c}`}>{m.v}</div>
            <div className="text-[10px] text-gray-600">{m.s}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1.5 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#e0524f' }} /> Money lost each year</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#1d9e75' }} /> Profit from running the business (2024-25)</span>
      </div>

      {/* Hand-rolled SVG bar chart */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
           aria-label="Bar chart: TANGEDCO yearly loss falling from 12,995 crore (FY22) to 437 crore (FY25); FY25 also shows 2,073 crore profit from running the business.">
        {/* gridlines + y labels */}
        {GRID.map(g => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={yOf(g)} y2={yOf(g)}
                  stroke={g === 0 ? '#4a4a4a' : '#242424'} strokeWidth={g === 0 ? 1.2 : 1} />
            <text x={padL - 4} y={yOf(g) + 3} textAnchor="end" fontSize="9.5" fill="#6b6b6b">
              {g === 0 ? '0' : (g / 1000) + 'k'}
            </text>
          </g>
        ))}

        {/* red loss bars (FY22-FY24 + tiny FY25) */}
        {NET.map((d, i) => {
          const isFy25 = i === 3;
          const bw = isFy25 ? 26 : 54;
          const x = isFy25 ? cx(i) - 30 : cx(i) - bw / 2;
          const h = yOf(d.v) - yZero;
          return (
            <g key={d.y}>
              <rect x={x} y={yZero} width={bw} height={Math.max(h, 1.5)} rx="2" fill="#e0524f" />
              <text x={isFy25 ? x + bw / 2 : cx(i)} y={yOf(d.v) + 13} textAnchor="middle"
                    fontSize="11" fontWeight="600" fill="#f08a87">{inr(d.v)}</text>
            </g>
          );
        })}

        {/* green operating-profit bar (FY25, above zero) */}
        <rect x={cx(3) + 4} y={yOf(OP_FY25)} width={26} height={yZero - yOf(OP_FY25)} rx="2" fill="#1d9e75" />
        <text x={cx(3) + 17} y={yOf(OP_FY25) - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#4cc79f">
          {inr(OP_FY25)}
        </text>

        {/* year labels */}
        {NET.map((d, i) => (
          <text key={d.y} x={cx(i)} y={H - 6} textAnchor="middle" fontSize="12" fill="#9a9a9a">{d.y}</text>
        ))}
      </svg>

      {/* The good news — plain */}
      <div className="rounded-md border border-emerald-800/40 bg-emerald-950/20 px-3 py-2.5 mt-2 mb-2.5">
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
