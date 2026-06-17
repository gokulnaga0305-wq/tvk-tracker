'use client';
/**
 * Decadal trend lines — TN's transformation over time, not just a snapshot.
 * Literacy 1961→2011 (TN vs India) and infant mortality 1971→2020.
 * Sources: Census of India (literacy); SRS (IMR).
 */
import { LineChart as LineIcon } from 'lucide-react';

const LIT_YEARS = ['1961', '1971', '1981', '1991', '2001', '2011'];
const LIT_TN = [36.4, 45.4, 54.4, 62.7, 73.5, 80.1];
const LIT_IN = [28.3, 34.5, 43.6, 52.2, 64.8, 73.0];

const IMR_YEARS = ['1971', '1991', '2001', '2011', '2020'];
const IMR_TN = [113, 57, 49, 22, 13];

function Chart({
  title, unit, years, a, b, aLabel, bLabel, max, lowerBetter,
}: {
  title: string; unit: string; years: string[];
  a: number[]; b?: number[]; aLabel: string; bLabel?: string;
  max: number; lowerBetter?: boolean;
}) {
  const W = 520, H = 180, padL = 30, padR = 12, padT = 12, padB = 22;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i: number, n: number) => padL + (i / (n - 1)) * iw;
  const y = (v: number) => padT + ih - (v / max) * ih;
  const path = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i, arr.length).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[13px] font-semibold text-white">{title}</div>
        <div className="text-[10.5px] text-gray-500">{unit}{lowerBetter ? ' · lower = better' : ''}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={padL} x2={W - padR} y1={y(max * f)} y2={y(max * f)} stroke="#262626" strokeWidth="1" />
        ))}
        {years.map((yr, i) => (
          <text key={yr} x={x(i, years.length)} y={H - 6} textAnchor="middle" fontSize="9" fill="#777">{yr}</text>
        ))}
        {b && <path d={path(b)} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 3" />}
        <path d={path(a)} fill="none" stroke="#f97316" strokeWidth="2.5" />
        {a.map((v, i) => <circle key={i} cx={x(i, a.length)} cy={y(v)} r="3" fill="#f97316" />)}
        {a.map((v, i) => (
          <text key={'l' + i} x={x(i, a.length)} y={y(v) - 7} textAnchor="middle" fontSize="9" fill="#fb923c" fontWeight="bold">{v}</text>
        ))}
      </svg>
      <div className="flex gap-4 text-[11px] mt-1">
        <span className="flex items-center gap-1.5 text-orange-300"><span className="w-3 h-[2px] bg-orange-500 inline-block" /> {aLabel}</span>
        {bLabel && <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-[2px] bg-slate-500 inline-block" /> {bLabel}</span>}
      </div>
    </div>
  );
}

export default function TrendLines() {
  return (
    <div className="space-y-5 mt-8">
      <div className="flex items-center gap-2">
        <LineIcon size={20} className="text-orange-400" />
        <h2 className="text-lg font-bold text-white">The long arc — TN over the decades</h2>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed -mt-2">
        A snapshot can be argued with; a trajectory can&rsquo;t. Two of the clearest lines of the Dravidian decades — literacy climbing,
        infant mortality collapsing.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <Chart title="Literacy rate" unit="% · Census" years={LIT_YEARS} a={LIT_TN} b={LIT_IN} aLabel="Tamil Nadu" bLabel="India" max={90} />
        <Chart title="Infant mortality" unit="per 1,000 · SRS" years={IMR_YEARS} a={IMR_TN} aLabel="Tamil Nadu" max={120} lowerBetter />
      </div>
      <p className="text-[12.5px] text-gray-400 leading-relaxed px-1">
        Literacy nearly <span className="text-orange-300">doubled past the national line</span>; infant deaths fell from <span className="text-orange-300">113
        to 13 per 1,000</span> (national ~28). These aren&rsquo;t one-government numbers — they&rsquo;re the compounding return on six decades of
        investing in people.
      </p>
      <p className="text-[11px] text-gray-600 px-1">Sources: Census of India (literacy 1961-2011); Sample Registration System (IMR).</p>
    </div>
  );
}
