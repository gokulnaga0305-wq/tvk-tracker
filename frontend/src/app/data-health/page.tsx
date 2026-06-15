'use client';
/**
 * Public Data Health page — the transparency play.
 *
 * Shows readers exactly how alive the data pipeline is: which feeds are
 * fetching, how recently each outlet's coverage arrived, and the
 * verification mix of the corpus. A tracker that shows its own plumbing
 * is harder to dismiss as propaganda — this page IS a credibility feature.
 *
 * Source: /api/diagnostics/data-health (public, zero provider/key info).
 */
import {
  Activity, Rss, Newspaper, ShieldCheck, CheckCircle2, XCircle, Clock, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { useApi } from '@/lib/useApi';
import { AsyncBoundary } from '@/components/AsyncBoundary';

interface Feed {
  label: string;
  last_success_hours_ago: number | null;
  items_last_fetch: number | null;
  status: 'ok' | 'failing';
}
interface Coverage { outlet: string; last_article_hours_ago: number }
interface Health {
  checked_at: string;
  feeds: Feed[];
  feeds_ok: number;
  feeds_failing: number;
  outlet_coverage: Coverage[];
  verification_mix: Record<string, number>;
  incidents_total: number;
  verified_pct: number | null;
}

const VS_META: Record<string, { label: string; color: string }> = {
  multi_source_verified: { label: 'Multi-source verified', color: 'bg-emerald-500' },
  press_verified:        { label: 'Press verified',        color: 'bg-green-600' },
  admin_verified:        { label: 'Admin verified',        color: 'bg-teal-600' },
  single_source:         { label: 'Single source',         color: 'bg-amber-600' },
  pending_verification:  { label: 'Pending verification',  color: 'bg-gray-600' },
};

function ago(h: number | null): string {
  if (h === null || h === undefined) return 'never';
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 48) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function DataHealthPage() {
  const health = useApi<Health>('/api/diagnostics/data-health');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-cyan-400" />
          <h1 className="text-xl font-bold text-white">Data Health</h1>
        </div>
        <button
          type="button"
          onClick={health.refetch}
          disabled={health.loading || health.refetching}
          aria-label="Refresh data health"
          className="text-gray-500 hover:text-white disabled:opacity-40 p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <RefreshCw size={15} className={health.refetching ? 'animate-spin' : ''} aria-hidden="true" />
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-6 max-w-3xl">
        Live state of this tracker&rsquo;s own pipeline — which feeds are fetching, how fresh each
        outlet&rsquo;s coverage is, and how much of the corpus is independently verified. We show our
        plumbing on purpose: judge the data by how it&rsquo;s collected.
      </p>

      <AsyncBoundary result={health} label="data health">
        {d => {
          const mix = d.verification_mix || {};
          const total = d.incidents_total || 0;
          return (
          <>
      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-2xl font-bold text-white">{total.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">incidents tracked</div>
        </div>
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-2xl font-bold text-emerald-400">{d.verified_pct ?? '—'}%</div>
          <div className="text-[11px] text-gray-500 mt-0.5">independently verified</div>
        </div>
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-2xl font-bold text-white">
            {(d.feeds_ok ?? 0) + (d.feeds_failing ?? 0) > 0
              ? <>{d.feeds_ok}<span className="text-sm text-gray-500">/{(d.feeds_ok ?? 0) + (d.feeds_failing ?? 0)}</span></>
              : '—'}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">feeds healthy</div>
        </div>
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-2xl font-bold text-white">{(d.outlet_coverage || []).length}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">outlets in corpus</div>
        </div>
      </div>

      {/* Verification mix */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 mb-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
          <ShieldCheck size={15} className="text-emerald-400" /> Verification mix
        </div>
        <div className="flex h-4 rounded overflow-hidden mb-3">
          {Object.entries(VS_META).map(([k, m]) => {
            const n = mix[k] || 0;
            if (!n || !total) return null;
            return <div key={k} className={m.color} style={{ width: `${(100 * n) / total}%` }} title={`${m.label}: ${n}`} />;
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(VS_META).map(([k, m]) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className={clsx('w-2 h-2 rounded-sm inline-block', m.color)} />
              {m.label}: <span className="text-gray-200 font-medium">{mix[k] ?? 0}</span>
            </span>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-3">
          &ldquo;Verified&rdquo; = confirmed by 2+ distinct press outlets, a press-tier source, or manual
          review with evidence. Single-source and pending items are shown on the site but labeled.
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Feed health */}
        <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Rss size={15} className="text-cyan-400" /> Configured feeds (fetch health)
          </div>
          {(d.feeds || []).length === 0 ? (
            <p className="text-[12px] text-gray-500">Telemetry warming up — populated after the next ingest cycle.</p>
          ) : (
            <div className="space-y-1.5">
              {d.feeds.map(f => (
                <div key={f.label} className="flex items-center gap-2 text-[12px]">
                  {f.status === 'ok'
                    ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    : <XCircle size={13} className="text-red-400 shrink-0" />}
                  <span className="text-gray-300 flex-1 truncate">{f.label}</span>
                  <span className="text-gray-500 shrink-0">{ago(f.last_success_hours_ago)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Outlet coverage */}
        <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Newspaper size={15} className="text-amber-400" /> Outlet coverage recency
          </div>
          <p className="text-[11px] text-gray-500 mb-2.5">
            When each outlet&rsquo;s coverage last arrived. An old timestamp usually means the outlet
            hasn&rsquo;t covered TN recently — not a fault.
          </p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {(d.outlet_coverage || []).map(c => (
              <div key={c.outlet} className="flex items-center gap-2 text-[12px]">
                <Clock size={12} className={clsx('shrink-0',
                  c.last_article_hours_ago < 6 ? 'text-emerald-400'
                    : c.last_article_hours_ago < 24 ? 'text-amber-400' : 'text-gray-600')} />
                <span className="text-gray-300 flex-1 truncate">{c.outlet}</span>
                <span className="text-gray-500 shrink-0">{ago(c.last_article_hours_ago)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="text-[11px] text-gray-600 mt-4">
        Checked {new Date(d.checked_at).toLocaleString('en-IN')} · use ↻ to refresh ·
        endpoint: /api/diagnostics/data-health (public)
      </p>
          </>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
