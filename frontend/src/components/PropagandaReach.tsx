'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PropagandaSummary } from '@/lib/api';
import {
  AlertTriangle, ExternalLink, Megaphone, Eye, EyeOff,
  TrendingUp, Info, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * PropagandaReach
 *
 * Closes the structural blind spot in the accountability dashboard:
 * we document failures, but most TN voters never see them — they see
 * pro-TVK propaganda instead. This widget makes the asymmetry visible.
 *
 * Reads /api/propaganda/summary, juxtaposes propaganda reach (likes/
 * views on manufactured-achievement content) against debunk reach (how
 * far our corrections travel). The ratio is almost always 100x+ in
 * favor of propaganda.
 *
 * Visible message: even if our meter says "high anti-incumbency", the
 * information ecosystem may be saying the opposite to most viewers.
 * Truth ≠ public perception when propaganda outpaces correction.
 */

const TYPE_LABELS: Record<string, string> = {
  manufactured_achievement: 'Manufactured achievement',
  dubbed_footage:           'Re-credited DMK-era footage',
  deepfake:                 'AI deepfake',
  paid_trending:            'Paid trending / amplification',
  misleading_edit:          'Misleading edit',
  fake_quote:               'Fabricated quote',
  meme_glorification:       'Mass-amplified meme',
  astroturfing:             'Astroturfing',
  misattributed_event:      'Misattributed event',
  other:                    'Other',
};

function formatReach(n: number | undefined | null): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function PropagandaReach() {
  const [data, setData] = useState<PropagandaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/propaganda/summary`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  // Don't render the widget at all if both sides are zero — keeps the
  // dashboard clean during initial bootstrap before any propaganda is
  // logged. As soon as one row exists, the widget appears with the
  // honest-asymmetry framing.
  if (loading) return null;
  if (!data) return null;
  const hasData =
    data.propaganda_events_tracked > 0 ||
    data.accountability_events_documented > 0;
  if (!hasData) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <Megaphone size={14} className="text-purple-400" />
          What TN is actually seeing
          <span className="text-gray-600 text-xs font-normal">
            (reach asymmetry between propaganda and truth)
          </span>
        </h2>
        <button
          onClick={() => setShowDisclaimer(v => !v)}
          className="text-[11px] text-gray-500 hover:text-purple-400 flex items-center gap-1"
          aria-label="Toggle methodology disclaimer"
        >
          <Info size={11} /> Method
        </button>
      </div>

      {showDisclaimer && (
        <div className="bg-purple-950/20 border border-purple-800/30 rounded-md px-3 py-2 mb-3 flex items-start gap-2 text-[11px] text-purple-200/80">
          <Info size={11} className="mt-0.5 shrink-0 text-purple-400" />
          <span>
            <strong className="text-purple-100">Honest disclaimer:</strong>{' '}
            {data.honest_disclaimer}
          </span>
        </div>
      )}

      {/* Two-column asymmetry view — both cards click into their
          respective drilldown lists. Accountability -> /incidents
          (all verified failures). Pro-TVK -> /propaganda (all fakes
          and their debunks). Hover state mirrors the dashboard
          widget pattern from BaselineDelta/StatCard. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* Accountability side -> /incidents */}
        <Link
          href="/incidents"
          className="group/card rounded-lg border border-emerald-800/40 bg-emerald-950/15 p-4 hover:border-emerald-600/60 hover:bg-emerald-950/25 transition-all block"
          aria-label="View all verified accountability incidents"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-emerald-300/70 uppercase tracking-wider font-medium flex items-center gap-1">
              <Eye size={11} /> Accountability documented
              <ChevronRight
                size={11}
                className="text-emerald-400/40 opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-0.5 transition-all"
              />
            </div>
            <TrendingUp size={12} className="text-emerald-400 opacity-50" />
          </div>
          <div className="text-3xl font-bold text-emerald-300">
            {data.accountability_verified ?? data.accountability_events_documented}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            verified failures + broken promises since May 11
          </div>
          <div className="text-[11px] text-emerald-500/70 mt-3">
            Independently verified (2+ outlets / admin-reviewed) in failure
            categories — of {data.accountability_events_documented} total documented
            TVK-era incidents.
          </div>
        </Link>

        {/* Propaganda side -> /propaganda
            Headline is the COMBINED total (curated propaganda + press-
            reported fake news) so the user sees one fake/misleading
            number, not two contradictory ones. Both pools are linked
            below for transparency about how the total was assembled. */}
        <Link
          href="/propaganda"
          className="group/card rounded-lg border border-rose-800/40 bg-rose-950/15 p-4 hover:border-rose-600/60 hover:bg-rose-950/25 transition-all block"
          aria-label="View all tracked pro-TVK propaganda + debunks"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-rose-300/70 uppercase tracking-wider font-medium flex items-center gap-1">
              <EyeOff size={11} /> Fake / misleading content
              <ChevronRight
                size={11}
                className="text-rose-400/40 opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-0.5 transition-all"
              />
            </div>
            <Megaphone size={12} className="text-rose-400 opacity-50" />
          </div>
          <div className="text-3xl font-bold text-rose-300">
            {data.total_fake_or_misleading ??
              (data.confirmed_fake_or_active +
                (data.press_reported_fake_news_count ?? 0))}
          </div>
          {/* Sub-stats that explain the headline number */}
          <div className="text-[11px] text-rose-300/70 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>
              <strong className="text-rose-200">
                {data.confirmed_fake_or_active}
              </strong>{' '}
              curated propaganda (with reach data)
            </span>
            {(data.press_reported_fake_news_count ?? 0) > 0 && (
              <span>
                <strong className="text-rose-200">
                  {data.press_reported_fake_news_count}
                </strong>{' '}
                press-reported fake news
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1.5">
            manufactured-achievement videos, dubbed footage, fake quotes
          </div>
          <div className="text-[11px] text-rose-500/70 mt-3">
            What our system caught — a tiny slice of actual volume.
          </div>
        </Link>
      </div>

      {/* Asymmetry ratio — the headline number */}
      {data.asymmetry_ratio !== null && data.propaganda_reach_total > 0 && (
        <div className="rounded-lg border border-orange-700/50 bg-gradient-to-br from-orange-950/40 to-rose-950/30 p-4 mb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-orange-400" />
              <div>
                <div className="text-[11px] text-orange-300/80 uppercase tracking-wider">
                  Reach asymmetry
                </div>
                <div className="text-2xl font-bold text-orange-200">
                  {data.asymmetry_ratio}×{' '}
                  <span className="text-sm font-normal text-orange-300/80">
                    propaganda &gt; correction
                  </span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-gray-400 max-w-md leading-relaxed">
              For every <strong className="text-orange-300">1 eyeball</strong>{' '}
              that sees a debunk, <strong className="text-rose-300">
                ~{Math.round(data.asymmetry_ratio)}
              </strong>{' '}
              see the original propaganda. Truth alone isn't enough — distribution decides perception.
            </div>
          </div>
          <div className="mt-3 flex items-center gap-6 text-[11px] text-gray-500 border-t border-orange-900/40 pt-2">
            <span>
              Propaganda reach:{' '}
              <strong className="text-rose-300">{formatReach(data.propaganda_reach_total)}</strong>
            </span>
            <span>
              Debunk reach:{' '}
              <strong className="text-emerald-300">{formatReach(data.debunk_reach_total)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Recent debunks */}
      {data.recent_debunks.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
            <Megaphone size={11} /> Recent debunks (last 7 days)
          </div>
          <div className="flex flex-col gap-2">
            {data.recent_debunks.map(d => {
              const propReach = d.reach_estimate || 0;
              const debunkReach = d.debunk_reach_estimate || 0;
              const ratio = debunkReach > 0 ? (propReach / debunkReach).toFixed(1) : null;
              return (
                <div
                  key={d.id}
                  className="border border-[#222] rounded-md px-3 py-2 hover:border-[#333] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 leading-snug font-medium">
                        {d.title}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="uppercase tracking-wider text-rose-400/70">
                          {TYPE_LABELS[d.propaganda_type] || d.propaganda_type}
                        </span>
                        {d.first_seen && (
                          <>
                            <span>·</span>
                            <span>
                              {new Date(d.first_seen).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short',
                              })}
                            </span>
                          </>
                        )}
                        {d.debunk_source && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400/80">
                              debunked by {d.debunk_source}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      {propReach > 0 && (
                        <span
                          className="text-rose-300/80"
                          title="Reach of the original propaganda"
                        >
                          {formatReach(propReach)} saw
                        </span>
                      )}
                      {debunkReach > 0 && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span
                            className="text-emerald-300/80"
                            title="Reach of the debunk / correction"
                          >
                            {formatReach(debunkReach)} corrected
                          </span>
                        </>
                      )}
                      {ratio && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span className="text-orange-400 font-semibold">
                            {ratio}× gap
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {(d.propaganda_url || d.debunk_url) && (
                    <div className="flex items-center gap-3 mt-1.5 text-[10.5px]">
                      {d.propaganda_url && (
                        <a
                          href={d.propaganda_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-rose-400/70 hover:text-rose-300 flex items-center gap-0.5"
                        >
                          <ExternalLink size={9} /> Original
                        </a>
                      )}
                      {d.debunk_url && (
                        <a
                          href={d.debunk_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400/70 hover:text-emerald-300 flex items-center gap-0.5"
                        >
                          <ExternalLink size={9} /> Debunk
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
