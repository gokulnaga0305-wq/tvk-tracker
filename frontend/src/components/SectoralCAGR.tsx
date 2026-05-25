'use client';
import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Info, Building2, Tractor, Coins,
  Briefcase, Activity as ActivityIcon,
} from 'lucide-react';

/**
 * SectoralCAGR — DMK-era sector-wise GSDP CAGR vs latest TVK-era observation.
 *
 * Consumes /api/economic/dashboard. Until TVK quarterly numbers start
 * landing in the `economic_quarterly_data` table, every card just shows
 * the DMK CAGR with a "TVK data pending" tag. As soon as the user (or a
 * scraper) POSTs to /api/economic/quarterly, the comparison fills in
 * automatically.
 *
 * Visual language deliberately mirrors `BaselineDelta` so the dashboard
 * reads as one continuous story: crime-rate delta panel → economic-CAGR
 * delta panel → incumbency meter integrates both.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CAGRRow {
  key: string;
  label: string;
  sector: 'headline' | 'agriculture' | 'industry' | 'services' | 'investment';
  dmk_cagr_pct: number;
  dmk_period: string;
  dmk_source: string;
  dmk_source_url: string | null;
  nominal: boolean;
  confidence: 'verified' | 'estimate';
  tvk_observed_pct: number | null;
  tvk_value_type: 'cagr_pct' | 'yoy_pct' | 'level' | null;
  tvk_period_label: string | null;
  tvk_source: string | null;
  tvk_source_url: string | null;
  tvk_notes: string | null;
  tvk_ingested_at: string | null;
  delta_pp: number | null;
  verdict: 'ahead' | 'behind' | 'tracking' | 'no_data';
}

interface CAGRSummary {
  total_metrics: number;
  with_tvk_data: number;
  tvk_ahead: number;
  tvk_behind: number;
  tvk_tracking: number;
  as_of: string;
}

interface CAGRResponse {
  summary: CAGRSummary;
  rows: CAGRRow[];
}

const SECTOR_META: Record<CAGRRow['sector'], { label: string; icon: any; color: string }> = {
  headline:    { label: 'Headline',       icon: ActivityIcon, color: 'text-orange-400'  },
  agriculture: { label: 'Agriculture',    icon: Tractor,      color: 'text-lime-400'    },
  industry:    { label: 'Industry',       icon: Building2,    color: 'text-sky-400'     },
  services:    { label: 'Services',       icon: Briefcase,    color: 'text-fuchsia-400' },
  investment:  { label: 'Investment & Trade', icon: Coins,    color: 'text-amber-400'   },
};

function CAGRCard({ row }: { row: CAGRRow }) {
  // Verdict from TVK's perspective: "ahead" of DMK CAGR is GOOD for TVK,
  // "behind" is BAD. We render the delta from TVK's POV consistently.
  const isAhead    = row.verdict === 'ahead';
  const isBehind   = row.verdict === 'behind';
  const isTracking = row.verdict === 'tracking';
  const noData     = row.verdict === 'no_data';

  const Icon =
    isAhead    ? TrendingUp   :
    isBehind   ? TrendingDown :
    isTracking ? Minus        : Minus;

  const cls =
    isAhead    ? 'text-emerald-400 border-emerald-800/40 bg-emerald-950/30' :
    isBehind   ? 'text-red-400     border-red-800/40     bg-red-950/30'      :
    isTracking ? 'text-yellow-400  border-yellow-800/40  bg-yellow-950/30'   :
                 'text-gray-400    border-[#2a2a2a]      bg-[#1a1a1a]';

  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs text-gray-400 uppercase tracking-wider font-medium leading-tight">
          {row.label}
          {row.nominal && (
            <span className="ml-1.5 text-[9px] text-gray-600 normal-case tracking-normal">
              (nominal)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {row.confidence === 'verified' ? (
            <span
              title={`Sourced from: ${row.dmk_source}`}
              className="text-[8px] uppercase tracking-wider px-1 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
            >
              cited
            </span>
          ) : (
            <span
              title={`Estimate, pending verification: ${row.dmk_source}`}
              className="text-[8px] uppercase tracking-wider px-1 py-0.5 rounded bg-gray-900 text-gray-500 border border-gray-700"
            >
              est.
            </span>
          )}
          <Icon size={14} className="opacity-70" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-white tabular-nums">
          {row.dmk_cagr_pct.toFixed(1)}<span className="text-base text-gray-500">%</span>
        </span>
        <span className="text-[10px] text-gray-600">DMK CAGR · {row.dmk_period}</span>
      </div>

      {noData ? (
        <div className="text-[11px] text-gray-600 italic">
          TVK data pending
        </div>
      ) : (
        <div className="text-xs">
          <span className="text-gray-500">TVK observed: </span>
          <span className="text-gray-300 font-mono">
            {row.tvk_observed_pct?.toFixed(1)}%
          </span>
          <span
            className={`ml-2 font-semibold ${
              isAhead ? 'text-emerald-400' :
              isBehind ? 'text-red-400' :
              'text-yellow-400'
            }`}
            title={`Difference in percentage points vs DMK CAGR (${row.dmk_period})`}
          >
            {row.delta_pp! > 0 ? '+' : ''}{row.delta_pp!.toFixed(2)} pp
          </span>
          {row.tvk_period_label && (
            <div className="text-[10px] text-gray-600 mt-1">
              {row.tvk_period_label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectorBlock({ sector, rows }: { sector: CAGRRow['sector']; rows: CAGRRow[] }) {
  if (!rows.length) return null;
  const meta = SECTOR_META[sector];
  const Icon = meta.icon;
  return (
    <div className="mb-5">
      <h3 className={`text-[11px] uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5 ${meta.color}`}>
        <Icon size={12} />
        {meta.label}
        <span className="text-gray-700 text-[10px] font-normal normal-case">
          · {rows.length} metric{rows.length === 1 ? '' : 's'}
        </span>
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {rows.map(r => <CAGRCard key={r.key} row={r} />)}
      </div>
    </div>
  );
}

export default function SectoralCAGR() {
  const [data, setData] = useState<CAGRResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    fetch(`${API}/api/economic/dashboard`, { signal: ctrl.signal, cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((j: CAGRResponse) => { if (!cancelled) { setData(j); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { clearTimeout(timer); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; ctrl.abort(); clearTimeout(timer); };
  }, []);

  if (loading) {
    return <section className="bg-[#15161c] border border-[#262833] rounded-lg p-5 mb-8 h-48 animate-pulse" />;
  }
  if (error || !data) return null;

  // Bucket rows by sector for grouped rendering.
  const bySector: Record<CAGRRow['sector'], CAGRRow[]> = {
    headline: [], agriculture: [], industry: [], services: [], investment: [],
  };
  data.rows.forEach(r => bySector[r.sector].push(r));

  const s = data.summary;
  const dataCompleteness = s.total_metrics > 0
    ? Math.round((s.with_tvk_data / s.total_metrics) * 100)
    : 0;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          Sectoral economy: DMK CAGR vs TVK regime
          <span className="text-gray-600 text-xs font-normal">
            (5-year DMK CAGR vs latest TVK observation, percentage-point delta)
          </span>
        </h2>
        <a
          href="/methodology#economic-baselines"
          className="text-[11px] text-gray-500 hover:text-orange-400 flex items-center gap-1"
        >
          <Info size={11} /> Sources & methodology
        </a>
      </div>

      {/* Summary strip */}
      <div className="bg-[#15161c] border border-[#262833] rounded-lg px-4 py-2.5 mb-4 flex items-center gap-4 flex-wrap text-[11px]">
        <span className="text-gray-400">
          Tracking <strong className="text-white">{s.total_metrics}</strong> sectoral metrics ·
          TVK data on <strong className="text-white">{s.with_tvk_data}</strong> ({dataCompleteness}%)
        </span>
        {s.with_tvk_data > 0 && (
          <>
            <span className="flex items-center gap-1 text-emerald-400">
              <TrendingUp size={11} />
              <strong>{s.tvk_ahead}</strong> ahead of DMK pace
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <Minus size={11} />
              <strong>{s.tvk_tracking}</strong> tracking
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <TrendingDown size={11} />
              <strong>{s.tvk_behind}</strong> behind
            </span>
          </>
        )}
        {s.with_tvk_data === 0 && (
          <span className="text-amber-400/80 italic">
            No TVK quarterly observations yet — cards show DMK baseline only.
          </span>
        )}
      </div>

      {/* Sectors */}
      <SectorBlock sector="headline"    rows={bySector.headline}    />
      <SectorBlock sector="agriculture" rows={bySector.agriculture} />
      <SectorBlock sector="industry"    rows={bySector.industry}    />
      <SectorBlock sector="services"    rows={bySector.services}    />
      <SectorBlock sector="investment"  rows={bySector.investment}  />
    </section>
  );
}
