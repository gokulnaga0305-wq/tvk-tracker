'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ExternalLink, Megaphone, AlertTriangle, Filter,
  TrendingDown, TrendingUp, Eye, Calendar, ArrowDownAZ, Info,
} from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * /propaganda — drilldown list of every tracked pro-TVK (or anti-TVK)
 * propaganda event with its debunk + reach asymmetry per event.
 *
 * Surfaced from the "Pro-TVK content tracked" card on the dashboard's
 * PropagandaReach widget. Lets users browse every documented fake /
 * manufactured-achievement / dubbed-footage / deepfake we've catalogued,
 * with the original propaganda URL on one side and the fact-checker
 * debunk URL on the other.
 */

interface PropagandaEvent {
  id: string;
  title: string;
  description: string | null;
  propaganda_type: string;
  favoring: string;
  platform: string | null;
  propaganda_url: string | null;
  reach_estimate: number | null;
  debunk_url: string | null;
  debunk_source: string | null;
  debunk_reach_estimate: number | null;
  first_seen: string | null;
  incident_date: string | null;
  status: string;
  tags: string[] | null;
  notes: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  manufactured_achievement: 'Manufactured achievement',
  dubbed_footage:           'Dubbed footage',
  deepfake:                 'AI deepfake',
  paid_trending:            'Paid trending',
  misleading_edit:          'Misleading edit',
  fake_quote:               'Fake quote',
  meme_glorification:       'Meme glorification',
  astroturfing:             'Astroturfing',
  misattributed_event:      'Misattributed event',
  other:                    'Other',
};

const TYPE_COLORS: Record<string, string> = {
  manufactured_achievement: 'text-rose-300 border-rose-700/50',
  dubbed_footage:           'text-orange-300 border-orange-700/50',
  deepfake:                 'text-purple-300 border-purple-700/50',
  paid_trending:            'text-yellow-300 border-yellow-700/50',
  misleading_edit:          'text-amber-300 border-amber-700/50',
  fake_quote:               'text-pink-300 border-pink-700/50',
  meme_glorification:       'text-fuchsia-300 border-fuchsia-700/50',
  astroturfing:             'text-cyan-300 border-cyan-700/50',
  misattributed_event:      'text-red-300 border-red-700/50',
  other:                    'text-gray-300 border-gray-700/50',
};

function formatReach(n: number | undefined | null): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type FavoringFilter = 'all' | 'TVK' | 'ANTI-TVK';
type SortMode = 'recent' | 'reach' | 'asymmetry';

export default function PropagandaPage() {
  const [events, setEvents] = useState<PropagandaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoring, setFavoring] = useState<FavoringFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    fetch(`${API}/api/propaganda/?limit=200`, { signal: ctrl.signal, cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { if (!cancelled) setEvents(Array.isArray(data) ? data : []); })
      .catch(e => { if (!cancelled && e?.name !== 'AbortError') setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; ctrl.abort(); };
  }, []);

  // Apply filters + sort
  const filtered = events
    .filter(e => favoring === 'all' || e.favoring === favoring)
    .filter(e => !typeFilter || e.propaganda_type === typeFilter)
    .sort((a, b) => {
      if (sortMode === 'reach') {
        return (b.reach_estimate || 0) - (a.reach_estimate || 0);
      }
      if (sortMode === 'asymmetry') {
        const ra = (a.reach_estimate || 0) / Math.max(1, a.debunk_reach_estimate || 1);
        const rb = (b.reach_estimate || 0) / Math.max(1, b.debunk_reach_estimate || 1);
        return rb - ra;
      }
      // recent
      const da = a.first_seen || a.incident_date || '';
      const db = b.first_seen || b.incident_date || '';
      return db.localeCompare(da);
    });

  const totalPropaganda = events.reduce((s, e) => s + (e.reach_estimate || 0), 0);
  const totalDebunk    = events.reduce((s, e) => s + (e.debunk_reach_estimate || 0), 0);
  const proTvk         = events.filter(e => e.favoring === 'TVK').length;
  const antiTvk        = events.filter(e => e.favoring === 'ANTI-TVK').length;

  // Unique propaganda types present
  const typesPresent = Array.from(new Set(events.map(e => e.propaganda_type))).sort();

  return (
    <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-400 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      {/* Hero */}
      <header className="mb-6 border-b border-[#1f1f1f] pb-5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Pro-TVK content tracked
          </h1>
          <span className="text-rose-400 text-xl font-semibold">{events.length}</span>
          <span className="text-gray-600 text-sm">documented since May 11</span>
        </div>
        <p className="text-gray-500 text-sm mt-2 max-w-3xl">
          Every manufactured-achievement video, dubbed footage, fake quote, deepfake and
          misleading edit that our pipeline has catalogued — alongside the fact-checker
          debunk that contradicted it. This is the OTHER side of the information ecosystem
          that the Accountability Pressure Index alone doesn't capture.
        </p>

        {events.length > 0 && (
          <div className="flex items-center gap-4 mt-4 text-[12px] flex-wrap">
            <span className="text-rose-400 flex items-center gap-1.5">
              <Megaphone size={11} /> {proTvk} pro-TVK
            </span>
            {antiTvk > 0 && (
              <span className="text-orange-400 flex items-center gap-1.5">
                <Megaphone size={11} /> {antiTvk} anti-TVK
              </span>
            )}
            <span className="text-gray-600">·</span>
            <span className="text-rose-300/80 flex items-center gap-1.5">
              <TrendingUp size={11} /> propaganda reach: {formatReach(totalPropaganda)}
            </span>
            <span className="text-gray-700">·</span>
            <span className="text-emerald-300/80 flex items-center gap-1.5">
              <TrendingDown size={11} /> debunk reach: {formatReach(totalDebunk)}
            </span>
            {totalDebunk > 0 && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-orange-400 font-bold">
                  {(totalPropaganda / totalDebunk).toFixed(1)}× asymmetry
                </span>
              </>
            )}
          </div>
        )}
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Favoring filter — who benefits */}
        <div className="inline-flex rounded-lg border border-[#262626] overflow-hidden text-xs">
          {([
            { k: 'all',       label: 'All',       icon: Filter },
            { k: 'TVK',       label: 'Pro-TVK',   icon: Megaphone },
            { k: 'ANTI-TVK',  label: 'Anti-TVK',  icon: Megaphone },
          ] as const).map((opt, i) => (
            <button
              key={opt.k}
              onClick={() => setFavoring(opt.k)}
              className={clsx(
                'px-3 py-1.5 flex items-center gap-1.5 transition-colors',
                i > 0 && 'border-l border-[#262626]',
                favoring === opt.k
                  ? 'bg-rose-600/20 text-rose-300'
                  : 'bg-[#161616] text-gray-500 hover:text-gray-300'
              )}
            >
              <opt.icon size={11} />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Type filter dropdown */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#161616] border border-[#262626] text-gray-300 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-rose-500"
        >
          <option value="">All types</option>
          {typesPresent.map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>

        {/* Sort selector */}
        <div className="inline-flex rounded-lg border border-[#262626] overflow-hidden text-xs">
          {([
            { k: 'recent',    label: 'Latest first', icon: Calendar },
            { k: 'reach',     label: 'Highest reach', icon: TrendingUp },
            { k: 'asymmetry', label: 'Worst asymmetry', icon: AlertTriangle },
          ] as const).map((opt, i) => (
            <button
              key={opt.k}
              onClick={() => setSortMode(opt.k)}
              className={clsx(
                'px-3 py-1.5 flex items-center gap-1.5 transition-colors',
                i > 0 && 'border-l border-[#262626]',
                sortMode === opt.k
                  ? 'bg-rose-600/20 text-rose-300'
                  : 'bg-[#161616] text-gray-500 hover:text-gray-300'
              )}
            >
              <opt.icon size={11} />
              {opt.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-gray-600 text-xs">
          Showing {filtered.length} of {events.length}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#141414] border border-[#262626] rounded-xl p-4 h-44 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-6 text-red-300 text-sm">
          Failed to load: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {events.length === 0
              ? 'No propaganda events tracked yet.'
              : 'No events match the current filters.'}
          </p>
          {events.length > 0 && filtered.length === 0 && (
            <button
              onClick={() => { setFavoring('all'); setTypeFilter(''); }}
              className="mt-3 text-xs text-rose-400 hover:text-rose-300"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(e => {
            const propReach = e.reach_estimate || 0;
            const debunkReach = e.debunk_reach_estimate || 0;
            const ratio = debunkReach > 0 && propReach > 0
              ? (propReach / debunkReach).toFixed(1)
              : null;
            const isAntiTvk = e.favoring === 'ANTI-TVK';

            return (
              <article
                key={e.id}
                className={clsx(
                  'group bg-[#141414] border rounded-xl p-4 transition-all',
                  isAntiTvk
                    ? 'border-orange-800/40 hover:border-orange-600/50'
                    : 'border-rose-900/40 hover:border-rose-700/50',
                )}
              >
                {/* Top row: type chip + favoring + date */}
                <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                  <span className={clsx(
                    'text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded border',
                    TYPE_COLORS[e.propaganda_type] || 'text-gray-300 border-gray-700/50'
                  )}>
                    {TYPE_LABELS[e.propaganda_type] || e.propaganda_type}
                  </span>
                  <div className="flex items-center gap-2 text-[10.5px] text-gray-500">
                    {isAntiTvk ? (
                      <span className="text-orange-400 font-medium">→ Anti-TVK</span>
                    ) : (
                      <span className="text-rose-400 font-medium">→ Pro-TVK</span>
                    )}
                    {e.first_seen && (
                      <>
                        <span>·</span>
                        <span>
                          {new Date(e.first_seen).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-white font-semibold text-[14px] leading-snug mb-2">
                  {e.title}
                </h3>

                {/* Body */}
                {e.description && (
                  <p className="text-gray-400 text-[12px] leading-relaxed line-clamp-3 mb-3">
                    {e.description}
                  </p>
                )}

                {/* Reach row */}
                <div className="flex items-center gap-2 text-[11px] flex-wrap mb-2">
                  {propReach > 0 && (
                    <span className="text-rose-300/80" title="Reach of the original propaganda">
                      <TrendingUp size={10} className="inline mr-0.5" />
                      {formatReach(propReach)} saw
                    </span>
                  )}
                  {debunkReach > 0 && (
                    <>
                      {propReach > 0 && <span className="text-gray-700">·</span>}
                      <span className="text-emerald-300/80" title="Reach of the debunk">
                        <Eye size={10} className="inline mr-0.5" />
                        {formatReach(debunkReach)} corrected
                      </span>
                    </>
                  )}
                  {ratio && (
                    <>
                      <span className="text-gray-700">·</span>
                      <span className="text-orange-400 font-bold">{ratio}× gap</span>
                    </>
                  )}
                  {!propReach && !debunkReach && (
                    <span className="text-gray-600 italic">reach not measured</span>
                  )}
                </div>

                {/* Footer — links + debunk source */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 text-[10.5px]">
                    {e.propaganda_url && (
                      <a
                        href={e.propaganda_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-400/70 hover:text-rose-300 flex items-center gap-0.5 transition-colors"
                      >
                        <ExternalLink size={9} /> Original
                      </a>
                    )}
                    {e.debunk_url && (
                      <a
                        href={e.debunk_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400/70 hover:text-emerald-300 flex items-center gap-0.5 transition-colors"
                      >
                        <ExternalLink size={9} /> Debunk
                      </a>
                    )}
                  </div>
                  {e.debunk_source && (
                    <span className="text-[10px] text-gray-500">
                      Fact-checked by{' '}
                      <strong className="text-gray-400">{e.debunk_source}</strong>
                    </span>
                  )}
                </div>

                {/* Tags */}
                {e.tags && e.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.tags.slice(0, 5).map(t => (
                      <span
                        key={t}
                        className="text-[9.5px] text-gray-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Footer disclaimer — match the dashboard widget */}
      <div className="mt-8 bg-purple-950/15 border border-purple-800/30 rounded-lg p-4 flex items-start gap-2 text-[11px] text-purple-200/70">
        <Info size={12} className="mt-0.5 shrink-0 text-purple-400" />
        <span>
          <strong className="text-purple-100">Honest caveat:</strong> these numbers reflect
          propaganda we've TRACKED, not the full volume circulating. The real asymmetry
          between pro-TVK manipulation and corrections is almost certainly larger — most
          fakes never reach a debunk pipeline. Treat this list as a minimum-floor estimate,
          not a comprehensive measurement.
        </span>
      </div>
    </main>
  );
}
