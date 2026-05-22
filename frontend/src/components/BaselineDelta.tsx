import { BaselineRow } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import clsx from 'clsx';

function DeltaCard({ row }: { row: BaselineRow }) {
  const delta = row.delta_pct;
  const isWorse = delta !== null && delta > 5;
  const isBetter = delta !== null && delta < -5;
  const isFlat = delta !== null && delta >= -5 && delta <= 5;
  const isUnknown = delta === null;

  const Icon = isWorse ? TrendingUp : isBetter ? TrendingDown : Minus;
  const colorClass = isWorse
    ? 'text-red-400 border-red-800/40 bg-red-950/30'
    : isBetter
      ? 'text-emerald-400 border-emerald-800/40 bg-emerald-950/30'
      : 'text-gray-400 border-[#2a2a2a] bg-[#1a1a1a]';

  return (
    <div className={clsx('rounded-lg border p-4', colorClass)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          {row.label}
        </div>
        <Icon size={14} className="opacity-60 shrink-0" />
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-white">{row.tvk_count}</span>
        <span className="text-xs text-gray-600">in {row.tvk_period_days}d under TVK</span>
      </div>
      {!isUnknown && (
        <div className="text-xs">
          <span className="text-gray-500">DMK pace: </span>
          <span className="text-gray-300 font-mono">{row.expected_at_dmk_rate}</span>
          <span className={clsx('ml-2 font-semibold', isWorse ? 'text-red-400' : isBetter ? 'text-emerald-400' : 'text-gray-400')}>
            {delta! > 0 ? '+' : ''}{delta}%
          </span>
        </div>
      )}
      {isUnknown && (
        <div className="text-xs text-gray-600 italic">No DMK baseline</div>
      )}
    </div>
  );
}

export default function BaselineDelta({ rows }: { rows: BaselineRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          DMK era vs TVK era
          <span className="text-gray-600 text-xs font-normal">(pro-rated to days under TVK)</span>
        </h2>
        <a
          href="/methodology"
          className="text-[11px] text-gray-500 hover:text-orange-400 flex items-center gap-1"
        >
          <Info size={11} /> How baselines are computed
        </a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {rows.map(r => (
          <DeltaCard key={r.category} row={r} />
        ))}
      </div>
    </section>
  );
}
