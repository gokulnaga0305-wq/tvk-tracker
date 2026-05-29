import { BaselineRow } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, Info, ExternalLink } from 'lucide-react';
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

  const sources = row.top_sources || [];
  const hasSources = sources.length > 0;

  return (
    <div className={clsx('rounded-lg border p-4 flex flex-col', colorClass)}>
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

      {/* Top press sources behind the count. Each chip links to the actual
          article so the user can verify rather than trust. Empty when
          tvk_count=0 (nothing to source yet). */}
      {hasSources && (
        <div className="mt-3 pt-2 border-t border-white/5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
            Sources
          </div>
          <div className="flex flex-col gap-1">
            {sources.map((s) => (
              <a
                key={s.incident_id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.incident_title || s.url}
                className="group text-[10.5px] text-gray-400 hover:text-orange-400 truncate flex items-center gap-1 transition-colors"
              >
                <ExternalLink size={9} className="opacity-50 group-hover:opacity-100 shrink-0" />
                <span className="font-medium text-gray-300 group-hover:text-orange-400">
                  {s.outlet}
                </span>
                <span className="text-gray-600 truncate">
                  · {s.incident_title}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BaselineDelta({ rows }: { rows: BaselineRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
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
      {/* Honest methodology caveat. The DMK "pace" is from NCRB
          state-wide totals (every reported case statewide). Our TVK
          count is what our scrapers picked up from press tweets +
          curated sources — a SUBSET of all reported events. So a
          green "−92%" on Murders doesn't mean TVK halved murders in
          TN; it likely reflects scraping coverage vs NCRB's full
          reporting.  Genuine progress will only show up over months
          once both sources stabilise on the same denominator. */}
      <div className="bg-amber-950/20 border border-amber-800/30 rounded-md px-3 py-2 mb-3 flex items-start gap-2 text-[11px] text-amber-300/80">
        <Info size={11} className="mt-0.5 shrink-0 text-amber-400" />
        <span>
          <strong className="text-amber-200">Caveat:</strong> DMK pace is NCRB statewide totals (every reported case).
          TVK count is what press tweets + curated sources surface — a partial sample.
          Treat directional signal cautiously; absolute crime parity will only emerge after months of NCRB data under TVK.
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {rows.map(r => (
          <DeltaCard key={r.category} row={r} />
        ))}
      </div>
    </section>
  );
}
