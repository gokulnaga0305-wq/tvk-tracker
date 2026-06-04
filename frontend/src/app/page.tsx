'use client';
import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import TopBar from '@/components/TopBar';
import IncidentCard from '@/components/IncidentCard';
import BaselineDelta from '@/components/BaselineDelta';
import IncumbencyMeter from '@/components/IncumbencyMeter';
import PropagandaReach from '@/components/PropagandaReach';
import SectoralCAGR from '@/components/SectoralCAGR';
import GovScorecard from '@/components/GovScorecard';
import { DashboardStats, Incident, BaselineRow } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/constants';
import Link from 'next/link';
import {
  DollarSign, Skull, ShieldAlert, Users, CheckSquare, Copy, AlertTriangle,
  Zap, ZapOff, Wine, ShieldOff, Flame, Clock, Landmark, FileX,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Default placeholder shown while waiting for the API. Note `promises_total: 389`
 * matches the real seeded manifesto count — kept consistent so the user
 * never sees an out-of-place "0/20" anymore.
 *
 * The previous version of this page was a Server Component, which meant the
 * fetch had to complete during SSR. When HF Spaces is cold (free tier sleeps
 * after idle, takes ~20-30s to wake) the SSR fetch would time out and the
 * page would lock in `MOCK_STATS` with no way to recover until reload. Moving
 * to client-side fetch means the user gets a brief loading state then real
 * numbers, no matter how long the backend takes to wake up.
 */
const INITIAL_STATS: DashboardStats = {
  govt_day: Math.floor((Date.now() - new Date('2026-05-11').getTime()) / 86400000) + 1,
  corruption_count: 0,
  murders_count: 0,
  sexual_assault_count: 0,
  crimes_women_kids_count: 0,
  credit_steal_count: 0,
  promises_kept: 0,
  promises_total: 389,
  total_incidents: 0,
};

const ALL_CATEGORIES = Object.entries(CATEGORY_LABELS);

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pending, setPending] = useState<Incident[]>([]);
  const [baselines, setBaselines] = useState<BaselineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Long timeout (60s) to ride out HF Spaces cold starts (~20-30s typical).
    // AbortController so we don't update state after unmount.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);

    Promise.all([
      fetch(`${API}/api/stats/dashboard`, { signal: ctrl.signal, cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      // Verified+recent only — these are the bulletproof headline incidents
      fetch(`${API}/api/incidents/?limit=6&verification_status=multi_source_verified`, { signal: ctrl.signal, cache: 'no-store' }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/baselines/dashboard`, { signal: ctrl.signal, cache: 'no-store' }).then(r => r.ok ? r.json() : []),
      // Single-source pending — the "breaking but wait" feed
      fetch(`${API}/api/incidents/?limit=5&verification_status=pending_verification`, { signal: ctrl.signal, cache: 'no-store' }).then(r => r.ok ? r.json() : []),
    ])
      .then(([s, inc, bl, pn]) => {
        if (cancelled) return;
        if (s) setStats(s);
        setIncidents(Array.isArray(inc) ? inc : []);
        setBaselines(Array.isArray(bl) ? bl : []);
        setPending(Array.isArray(pn) ? pn : []);
        setBackendDown(!s);
      })
      .catch(() => {
        if (!cancelled) setBackendDown(true);
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; ctrl.abort(); clearTimeout(timer); };
  }, []);

  return (
    <>
      <TopBar stats={stats} />
      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track incidents, promises, and governance signals from the TVK government.
          </p>
          {loading && stats.total_incidents === 0 && (
            <p className="text-gray-700 text-xs mt-2 italic">Loading live data — backend may be warming up…</p>
          )}
          {backendDown && (
            <p className="text-red-500 text-xs mt-2">
              Cannot reach backend. Some counters may be outdated. Will retry on next load.
            </p>
          )}
        </div>

        {/* Incumbency meter — realtime, evidence-weighted accountability gauge.
            Placed above the trust banner so it's the first visual the user
            sees after the header. Self-fetches + 5-min polls — never blocks
            the rest of the dashboard render. */}
        <IncumbencyMeter />

        {/* Government Scorecard — shows wins (delivered promises) alongside
            failures so the dashboard reads as a scorekeeper, not a
            prosecutor. Single biggest credibility move for skeptics. */}
        <GovScorecard />

        {/* Propaganda Reach panel — surfaces the asymmetry between what
            we've documented vs what TN voters actually see. User pointed
            out (correctly) that the meter alone misleads readers into
            thinking the accountability score reflects public sentiment.
            This widget makes the gap honest. */}
        <PropagandaReach />

        {/* Trust transparency banner — three honest tiers instead of the
            old misleading two-bucket count. Lumping single-press incidents
            under "multi-source verified" was inaccurate; the new breakdown
            shows each tier separately so users see exactly where the
            evidence stands. */}
        {(stats.total_incidents ?? 0) > 0 && (
          <div className="bg-[#15161c] border border-[#262833] rounded-lg px-4 py-3 mb-5 flex items-center gap-x-4 gap-y-2 flex-wrap text-sm">
            <span className="text-gray-400">
              Tracking <strong className="text-white">{stats.total_incidents}</strong> incidents:
            </span>
            <span
              className="flex items-center gap-1.5 text-emerald-400"
              title="Two or more independent press outlets reported the same event (or admin manually verified)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <strong>{stats.cross_verified_count ?? 0}</strong>
              <span className="text-emerald-400/70">cross-verified</span>
            </span>
            <span
              className="flex items-center gap-1.5 text-sky-400"
              title="One press outlet has reported this — credible single source (Hindu, SunNewsTamil, News18 Tamil, Spark+, PttvNewsX, etc.)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
              <strong>{stats.press_verified_count ?? 0}</strong>
              <span className="text-sky-400/70">press-confirmed</span>
            </span>
            <span
              className="flex items-center gap-1.5 text-amber-400"
              title="Reported on Reddit / social media only — no press confirmation yet"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              <strong>{stats.community_pending_count ?? stats.unverified_incidents ?? 0}</strong>
              <span className="text-amber-400/70">community reports</span>
            </span>
            <a href="/methodology" className="ml-auto text-xs text-gray-500 hover:text-white underline-offset-2 hover:underline">
              How we verify →
            </a>
          </div>
        )}

        {/* Trending / hot categories — Power & EB merged into one widget
            since citizens experience them as the same "electricity issue".
            Internal DB still keeps power_cut vs eb_failure distinct so we
            can drill down. */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          <StatCard label="Power & EB"     value={stats.power_eb_count ?? ((stats.power_cut_count ?? 0) + (stats.eb_failure_count ?? 0))}
                                            verified={stats.power_eb_verified ?? ((stats.power_cut_verified ?? 0) + (stats.eb_failure_verified ?? 0))}
                                            topSources={stats.top_sources?.power_eb}
                                            href="power_eb"
                                            icon={ZapOff} color="text-amber-400" />
          <StatCard label="Alcohol Menace" value={stats.alcohol_menace_count ?? 0} verified={stats.alcohol_menace_verified} topSources={stats.top_sources?.alcohol_menace} href="alcohol_menace" icon={Wine}      color="text-pink-400" />
          <StatCard label="Police Excess"  value={stats.police_excess_count ?? 0}  verified={stats.police_excess_verified} topSources={stats.top_sources?.police_excess}  href="police_excess"  icon={ShieldOff}  color="text-red-400" />
          {/* Fake News stat card removed — the press-reported fake_news pool is now
              surfaced inside the PropagandaReach widget alongside the curated
              propaganda_events count, so the dashboard shows ONE fake/misleading
              story (e.g. "23 fake/misleading: 20 curated + 3 press-reported")
              instead of two contradictory top-level numbers (23 propaganda vs
              3 fake news). The /category/fake_news drilldown still works. */}
          <StatCard label="Civic Failure"  value={(stats as any).civic_failure_count ?? 0}
                                            verified={(stats as any).civic_failure_verified}
                                            topSources={stats.top_sources?.civic_failure}
                                            href="civic_failure"
                                            icon={AlertTriangle} color="text-orange-400" />
        </div>

        {/* Crime stat cards */}
        {/* Honest "sample, not census" guard — our counts are press-reported
            incidents we've documented, NOT comprehensive crime statistics.
            Without this, a per-month rate could be misread as TN's actual
            crime rate. Stating it openly is what keeps the numbers credible
            (and pre-empts the "your 29 vs NCRB's 1,690" critique). */}
        <p className="text-[11px] text-gray-500 mb-2 leading-relaxed max-w-3xl">
          ⓘ These are <span className="text-gray-400">press-reported incidents we&apos;ve documented</span> —
          a visible sample of what reaches the news, <span className="text-gray-400">not TN&apos;s
          full crime statistics</span> (for scale, NCRB recorded 1,690 murders in TN in 2022).
          Read them as &quot;what&apos;s surfacing under this government,&quot; not a complete crime rate.
          The honest baselines are <a href="/economy" className="text-orange-400 hover:underline">economic</a> and{' '}
          <a href="/promises" className="text-orange-400 hover:underline">promise delivery</a>, where the figures are comprehensive.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Corruption"          value={stats.corruption_count}        verified={stats.corruption_verified}        topSources={stats.top_sources?.corruption}        href="corruption"        icon={DollarSign}  color="text-yellow-400" govtDays={stats.govt_day} />
          <StatCard label="Murders"             value={stats.murders_count}           verified={stats.murders_verified}           topSources={stats.top_sources?.murders}           href="murders"           icon={Skull}       color="text-red-500" govtDays={stats.govt_day} />
          <StatCard label="Sexual Assaults"     value={stats.sexual_assault_count}    verified={stats.sexual_assault_verified}    topSources={stats.top_sources?.sexual_assault}    href="sexual_assault"    icon={ShieldAlert} color="text-red-400" govtDays={stats.govt_day} />
          <StatCard label="Crimes vs Children"  value={stats.crimes_women_kids_count} verified={stats.crimes_women_kids_verified} topSources={stats.top_sources?.crimes_women_kids} href="crimes_women_kids" icon={Users}       color="text-orange-400" govtDays={stats.govt_day} />
          <StatCard
            label="Promises Kept"
            value={stats.promises_kept}
            sub={`/${stats.promises_total}`}
            icon={CheckSquare}
            color="text-green-400"
          />
        </div>

        {/* Governance + promise + credit-steal widgets — previously these
            sat hidden inside the trust banner's 213 total but had no
            dedicated card on the dashboard. Governance alone is ~40% of
            our incidents, so it deserves visibility. */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Governance Gaps"
            value={stats.governance_count ?? 0}
            verified={stats.governance_verified}
            topSources={stats.top_sources?.governance}
            href="governance"
            icon={Landmark}
            color="text-sky-400"
          />
          <StatCard
            label="Broken Promises"
            value={stats.broken_promise_count ?? 0}
            verified={stats.broken_promise_verified}
            topSources={stats.top_sources?.broken_promise}
            href="broken_promise"
            icon={FileX}
            color="text-rose-400"
          />
          <StatCard
            label="Credit Stealing"
            value={stats.credit_steal_count ?? 0}
            verified={stats.credit_steal_verified}
            topSources={stats.top_sources?.credit_stealing}
            href="credit_stealing"
            icon={Copy}
            color="text-blue-400"
          />
          {/* Link cell to view every category — keeps surface area honest
              without cluttering with rare buckets (custodial_death,
              honour_killing, propaganda, etc.). */}
          <a
            href="/incidents"
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 flex flex-col items-center justify-center gap-1 hover:border-[#333] transition-colors group col-span-2"
          >
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">All categories</span>
            <span className="text-orange-400 text-sm font-medium group-hover:text-orange-300">
              View all {stats.total_incidents ?? 0} incidents →
            </span>
            <span className="text-[11px] text-gray-600 mt-1">includes honour killing · custodial death · water shortage · propaganda · more</span>
          </a>
        </div>

        {/* DMK era vs TVK era delta panel — crime/governance event counts */}
        {baselines.length > 0 && <BaselineDelta rows={baselines} />}

        {/* Sectoral economy: DMK 5yr CAGR vs latest TVK observation.
            Self-fetches /api/economic/dashboard. Renders even when there's
            no TVK data yet (cards just show DMK baseline as the anchor). */}
        <SectoralCAGR />

        {/* Credit steal highlight */}
        {stats.credit_steal_count > 0 && (
          <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
            <Copy size={16} className="text-blue-400 shrink-0" />
            <span className="text-blue-300 text-sm">
              <strong className="text-blue-200">{stats.credit_steal_count} Credit Steal</strong> incident{stats.credit_steal_count > 1 ? 's' : ''} documented —
              TVK claiming credit for previous DMK government work.
            </span>
          </div>
        )}

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="bg-orange-600 text-white text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer">
            All
          </span>
          {ALL_CATEGORIES.map(([key, label]) => (
            <a
              key={key}
              href={`/incidents?category=${key}`}
              className="bg-[#1e1e1e] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444] text-xs px-3 py-1.5 rounded-full transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* === BREAKING — UNCONFIRMED feed ===
            Single-source pending items. The "wait before sharing" warning
            counters the WhatsApp-virality problem: people would otherwise
            see something in their timeline, take it as fact, and amplify
            before press confirms. Here it's labeled honestly. */}
        {pending.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-amber-950/40 to-yellow-950/20 border border-amber-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-amber-300 font-semibold flex items-center gap-2">
                <Flame size={16} className="text-amber-400" />
                Breaking — Unconfirmed
              </h2>
              <div className="flex items-center gap-2 text-amber-400/80 text-xs">
                <Clock size={11} />
                <span>Single source · Wait before sharing</span>
              </div>
            </div>
            <div className="space-y-2">
              {pending.slice(0, 5).map(p => (
                <Link
                  key={p.id}
                  href={`/incidents/${p.id}`}
                  className="block bg-black/30 border border-amber-900/30 hover:border-amber-700/50 rounded-md px-3 py-2 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 mt-2" />
                    <div className="flex-1 min-w-0">
                      <div className="text-amber-100 text-sm leading-snug line-clamp-2">
                        {p.title}
                      </div>
                      <div className="text-amber-500/70 text-[11px] mt-1 flex items-center gap-3 flex-wrap">
                        <span className="uppercase tracking-wider">
                          {(p.category || '').replace(/_/g, ' ')}
                        </span>
                        {p.location && <span>· {p.location}</span>}
                        <span>· {new Date(p.incident_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-amber-500/60 text-[11px] mt-3 italic">
              These will auto-promote to verified within 24-72h if press outlets corroborate.
              Until then, share only if you can independently verify.
            </div>
          </div>
        )}

        {/* Recent incidents */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-400" />
            Verified Incidents · Latest
          </h2>
          <a href="/incidents" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
            View all →
          </a>
        </div>

        {loading && incidents.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 h-40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidents.map(incident => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
