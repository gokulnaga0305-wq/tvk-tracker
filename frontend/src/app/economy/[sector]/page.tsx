'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Minus,
  Building2, Tractor, Coins, Briefcase, Activity, Info,
} from 'lucide-react';

/**
 * /economy/[sector] — drill-down detail page for one sector of the DMK-vs-TVK
 * CAGR panel.
 *
 * Design rule: plain English, no jargon. We:
 *   - List every metric in the sector (full label, not key)
 *   - For each: DMK 5-yr trajectory + latest TVK reading side-by-side
 *   - "Cited" vs "Estimate" tag remains visible (trust transparency)
 *   - Click source URL → opens the original PDF/article
 *   - Notes are written for a non-economist reader
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type SectorKey = 'headline' | 'agriculture' | 'industry' | 'services' | 'investment';

const SECTOR_META: Record<SectorKey, { label: string; icon: any; color: string; intro: string }> = {
  headline: {
    label: 'Headline numbers',
    icon: Activity,
    color: 'text-orange-400',
    intro: 'The big-picture economic numbers. GSDP (the state\'s total economic output), per-capita income (average earnings per person).',
  },
  agriculture: {
    label: 'Agriculture',
    icon: Tractor,
    color: 'text-lime-400',
    intro: 'Farming, livestock, fishing and forestry. About 6-7% of Tamil Nadu\'s economy but a huge share of livelihoods.',
  },
  industry: {
    label: 'Industry',
    icon: Building2,
    color: 'text-sky-400',
    intro: 'Manufacturing, construction, mining, electricity. About one-third of Tamil Nadu\'s economy. TN is India\'s #2 manufacturing state.',
  },
  services: {
    label: 'Services',
    icon: Briefcase,
    color: 'text-fuchsia-400',
    intro: 'Trade, hotels, transport, finance, real estate, public admin. Over half of TN\'s economy and the fastest-growing chunk.',
  },
  investment: {
    label: 'Investment & Trade',
    icon: Coins,
    color: 'text-amber-400',
    intro: 'Foreign investment flowing in, exports going out, state tax revenue collected. Indicators of investor confidence.',
  },
};

interface DashboardRow {
  key: string;
  label: string;
  sector: SectorKey;
  dmk_cagr_pct: number;
  dmk_period: string;
  dmk_source: string;
  dmk_source_url: string | null;
  nominal: boolean;
  confidence: 'verified' | 'estimate';
  tvk_observed_pct: number | null;
  tvk_value_type: string | null;
  tvk_period_label: string | null;
  tvk_source: string | null;
  tvk_source_url: string | null;
  tvk_notes: string | null;
  tvk_ingested_at: string | null;
  delta_pp: number | null;
  verdict: 'ahead' | 'behind' | 'tracking' | 'no_data';
}

interface CAGRResponse {
  summary: { total_metrics: number; with_tvk_data: number };
  rows: DashboardRow[];
}

function plainVerdict(v: DashboardRow['verdict'], delta: number | null): { label: string; color: string; icon: any } {
  if (v === 'ahead')    return { label: `TVK doing better — ${(delta ?? 0) > 0 ? '+' : ''}${delta?.toFixed(1)}% above DMK pace`, color: 'text-emerald-400', icon: TrendingUp };
  if (v === 'behind')   return { label: `TVK falling behind — ${delta?.toFixed(1)}% below DMK pace`, color: 'text-red-400', icon: TrendingDown };
  if (v === 'tracking') return { label: 'Tracking close to DMK pace', color: 'text-yellow-400', icon: Minus };
  return { label: 'No TVK data yet', color: 'text-gray-500', icon: Minus };
}

function MetricRow({ row }: { row: DashboardRow }) {
  const verdict = plainVerdict(row.verdict, row.delta_pp);
  const Icon = verdict.icon;
  return (
    <article id={row.key} className="bg-[#15161c] border border-[#262833] rounded-lg p-5 mb-4 scroll-mt-24">
      <header className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold">
            {row.label}
            {row.nominal && (
              <span className="ml-2 text-[10px] text-gray-500 normal-case font-normal">
                (figures include inflation)
              </span>
            )}
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">{row.dmk_period} period under DMK</p>
        </div>
        {row.confidence === 'verified' ? (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            cited from official source
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-gray-900 text-gray-500 border border-gray-700">
            estimate — verify
          </span>
        )}
      </header>

      {/* DMK vs TVK side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="bg-black/30 border border-[#262833] rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            How fast it grew per year under DMK
          </div>
          <div className="text-3xl font-bold text-white tabular-nums">
            {row.dmk_cagr_pct.toFixed(1)}<span className="text-base text-gray-500">%</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 leading-snug">
            Compound growth rate ({row.dmk_period}). Higher is better.
          </p>
        </div>
        <div className={`border rounded p-3 ${
          row.verdict === 'no_data' ? 'bg-[#15161c] border-[#262833]' :
          row.verdict === 'behind' ? 'bg-red-950/20 border-red-900/30' :
          row.verdict === 'ahead' ? 'bg-emerald-950/20 border-emerald-900/30' :
          'bg-yellow-950/20 border-yellow-900/30'
        }`}>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            Latest reading under TVK
          </div>
          {row.tvk_observed_pct !== null ? (
            <>
              <div className={`text-3xl font-bold tabular-nums ${verdict.color}`}>
                {row.tvk_observed_pct.toFixed(1)}<span className="text-base opacity-70">%</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{row.tvk_period_label}</p>
            </>
          ) : (
            <div className="text-gray-600 italic text-sm py-2">
              No TVK quarterly data published yet.
              <br />
              <span className="text-[10px]">Will populate when RBI / TN Survey / MoSPI release new numbers.</span>
            </div>
          )}
        </div>
      </div>

      {/* One-line verdict */}
      <div className={`flex items-center gap-2 mb-3 text-sm ${verdict.color}`}>
        <Icon size={14} />
        <strong>{verdict.label}</strong>
      </div>

      {/* Sources */}
      <div className="border-t border-white/5 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
        <div>
          <div className="text-gray-500 uppercase tracking-wider mb-1 text-[10px]">DMK-era source</div>
          {row.dmk_source_url ? (
            <a href={row.dmk_source_url} target="_blank" rel="noopener noreferrer"
               className="text-orange-400 hover:underline inline-flex items-center gap-0.5">
              {row.dmk_source} <ExternalLink size={9} />
            </a>
          ) : (
            <span className="text-gray-400">{row.dmk_source}</span>
          )}
        </div>
        <div>
          <div className="text-gray-500 uppercase tracking-wider mb-1 text-[10px]">TVK-era source</div>
          {row.tvk_source ? (
            row.tvk_source_url ? (
              <a href={row.tvk_source_url} target="_blank" rel="noopener noreferrer"
                 className="text-orange-400 hover:underline inline-flex items-center gap-0.5">
                {row.tvk_source} <ExternalLink size={9} />
              </a>
            ) : (
              <span className="text-gray-400">{row.tvk_source}</span>
            )
          ) : (
            <span className="text-gray-600 italic">awaiting first release</span>
          )}
        </div>
      </div>

      {row.tvk_notes && (
        <p className="text-[11px] text-gray-500 italic mt-3 pt-3 border-t border-white/5">
          {row.tvk_notes}
        </p>
      )}
    </article>
  );
}

export default function EconomySectorPage({ params }: { params: Promise<{ sector: string }> }) {
  // Next.js 15+ exposes params as a Promise — use() it client-side
  const { sector } = use(params);
  const sectorKey = sector as SectorKey;
  const meta = SECTOR_META[sectorKey];

  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/economic/dashboard`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() as Promise<CAGRResponse> : Promise.reject())
      .then(d => { if (!cancelled) setRows((d.rows || []).filter(r => r.sector === sectorKey)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sectorKey]);

  if (!meta) {
    return (
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <p className="text-gray-400">Unknown sector: <code>{sector}</code></p>
        <Link href="/" className="text-orange-400 hover:underline text-sm mt-3 inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Back to dashboard
        </Link>
      </main>
    );
  }

  const Icon = meta.icon;
  return (
    <main className="flex-1 p-3 sm:p-6 max-w-4xl mx-auto w-full">
      <Link href="/" className="text-gray-500 hover:text-white text-xs inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={11} /> Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className={`text-2xl font-bold flex items-center gap-2 ${meta.color}`}>
          <Icon size={22} />
          {meta.label}
        </h1>
        <p className="text-gray-400 text-sm mt-2 leading-relaxed max-w-2xl">
          {meta.intro}
        </p>
      </div>

      <div className="bg-[#15161c] border border-[#262833] rounded-lg p-3 mb-6 text-xs text-gray-400 flex items-start gap-2">
        <Info size={12} className="mt-0.5 shrink-0 text-gray-500" />
        <span>
          We compare DMK's 5-year growth rate (2021-2026) to whatever TVK delivers
          quarter-by-quarter. If TVK can't match DMK's pace, that's a fair
          accountability signal.
        </span>
      </div>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) =>
            <div key={i} className="bg-[#15161c] border border-[#262833] rounded-lg p-5 h-48 animate-pulse" />
          )}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="text-gray-500 italic">No metrics found in this sector.</p>
      )}

      {!loading && rows.map(r => <MetricRow key={r.key} row={r} />)}
    </main>
  );
}
