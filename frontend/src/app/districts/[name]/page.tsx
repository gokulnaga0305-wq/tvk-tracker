'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  MapPin, ArrowLeft, ExternalLink, ShieldCheck, AlertTriangle, Calendar,
  Newspaper, MessageSquare, Activity,
} from 'lucide-react';

/**
 * /districts/[name] — drill-down page for a single Tamil Nadu district.
 *
 * Shows:
 *   - District header with current sentiment score + zone
 *   - 7d vs 30d breakdown
 *   - List of every reported incident in that district (most recent first)
 *     with full title, summary, severity, sentiment, and clickable
 *     SOURCE links for credibility
 *
 * The source links are the credibility anchor — every claim on this page
 * is traceable back to its press URL (The Hindu, Vikatan, Sun News, etc.).
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface IncidentSource {
  url: string;
  outlet: string;
  credibility_tier: string;
  title?: string;
}

interface Incident {
  id: string;
  title: string;
  summary: string;
  category: string;
  incident_date: string;
  location: string | null;
  district: string | null;
  source_urls: string[];
  sources?: IncidentSource[];
  is_credit_steal: boolean;
  severity: number;
  verification_status: string;
  press_sentiment: 'positive_for_govt' | 'negative_for_govt' | 'neutral' | null;
  source_count?: number;
  created_at: string;
}

interface DistrictRow {
  district: string;
  score_7d: number;
  score_30d: number;
  zone_7d: string;
  zone_30d: string;
  incidents_7d: number;
  incidents_30d: number;
  top_categories_7d: Array<{ category: string; count: number }>;
  top_categories_30d: Array<{ category: string; count: number }>;
  last_incident_date: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  corruption:        'Corruption',
  murders:           'Murder',
  sexual_assault:    'Sexual assault',
  crimes_women_kids: 'Crime vs women/kids',
  power_cut:         'Power cut',
  water_shortage:    'Water shortage',
  honour_killing:    'Honour killing',
  custodial_death:   'Custodial death',
  police_excess:     'Police excess',
  broken_promise:    'Broken promise',
  partial_promise:   'Partial promise',
  kept_promise:      'Promise kept',
  new_initiative:    'New initiative',
  alcohol_menace:    'Alcohol issue',
  governance:        'Governance gap',
  civic_failure:     'Civic failure',
  fake_news:         'Fake news',
  eb_failure:        'EB failure',
  attack_on_press:   'Press attack',
  credit_stealing:   'Credit stealing',
  communal_violence: 'Communal violence',
  other:             'Other',
};

function zoneStyle(zone: string) {
  switch (zone) {
    case 'Very angry': return 'text-red-400';
    case 'Angry':      return 'text-orange-400';
    case 'Tense':      return 'text-yellow-400';
    case 'Calm':       return 'text-lime-400';
    case 'Quiet':      return 'text-emerald-400';
    default:           return 'text-gray-400';
  }
}

function severityColor(s: number) {
  if (s >= 5) return 'bg-red-950/60 text-red-300 border-red-800/60';
  if (s >= 4) return 'bg-orange-950/60 text-orange-300 border-orange-800/60';
  if (s >= 3) return 'bg-yellow-950/60 text-yellow-300 border-yellow-800/50';
  return 'bg-gray-800/60 text-gray-300 border-gray-700';
}

function tierBadge(tier: string): { label: string; cls: string } {
  switch (tier) {
    case 'primary':            return { label: 'GOVT',        cls: 'bg-blue-950/60 text-blue-300 border-blue-800/60' };
    case 'established_press':  return { label: 'PRESS',       cls: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' };
    case 'regional_press':     return { label: 'REGIONAL',    cls: 'bg-teal-950/60 text-teal-300 border-teal-800/60' };
    case 'online_native':      return { label: 'ONLINE',      cls: 'bg-violet-950/60 text-violet-300 border-violet-800/60' };
    case 'govt_announcement':  return { label: 'CMO/DIPR',    cls: 'bg-sky-950/60 text-sky-300 border-sky-800/60' };
    case 'social_media':       return { label: 'SOCIAL',      cls: 'bg-gray-800 text-gray-400 border-gray-700' };
    default:                   return { label: tier?.toUpperCase() || 'SRC', cls: 'bg-gray-800 text-gray-400 border-gray-700' };
  }
}

function sentimentBadge(s: Incident['press_sentiment']) {
  if (!s) return null;
  if (s === 'negative_for_govt') return <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/40">critical</span>;
  if (s === 'positive_for_govt') return <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">favourable</span>;
  return <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">neutral</span>;
}

function IncidentCard({ inc }: { inc: Incident }) {
  return (
    <article id={inc.id} className="bg-[#15161c] border border-[#262833] rounded-lg p-4 hover:border-[#3a3c4a] transition-colors">
      <header className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <h3 className="text-white text-sm font-semibold leading-snug flex-1 min-w-0">
          {inc.title}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {sentimentBadge(inc.press_sentiment)}
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityColor(inc.severity)}`}>
            sev {inc.severity}
          </span>
        </div>
      </header>

      <p className="text-gray-400 text-xs leading-relaxed mb-3">
        {inc.summary}
      </p>

      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3 flex-wrap">
        <span className="flex items-center gap-1">
          <Calendar size={9} />
          {new Date(inc.incident_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="text-gray-700">·</span>
        <span className="uppercase tracking-wider">
          {CATEGORY_LABELS[inc.category] ?? inc.category}
        </span>
        {inc.location && (
          <>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1">
              <MapPin size={9} />
              {inc.location}
            </span>
          </>
        )}
        {inc.verification_status === 'multi_source_verified' || inc.verification_status === 'admin_verified' ? (
          <>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck size={9} />
              verified
            </span>
          </>
        ) : (
          <>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle size={9} />
              single source
            </span>
          </>
        )}
      </div>

      {/* Sources — the credibility anchor */}
      <div className="border-t border-[#222] pt-2.5">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
          <Newspaper size={10} />
          Sources ({inc.sources?.length ?? inc.source_urls?.length ?? 0})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(inc.sources && inc.sources.length > 0 ? inc.sources : (inc.source_urls || []).map(url => ({ url, outlet: '?', credibility_tier: 'unknown' }))).map((src, i) => {
            const t = tierBadge(src.credibility_tier);
            let host = src.outlet || '';
            if (!host || host === '?' || host === 'unknown') {
              try { host = new URL(src.url).hostname.replace('www.', ''); } catch { host = 'source'; }
            }
            return (
              <a
                key={src.url + i}
                href={src.url}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] bg-black/30 hover:bg-black/50 border border-[#262833] hover:border-[#3a3c4a] rounded px-2 py-1 transition-colors"
              >
                <span className={`text-[9px] uppercase tracking-wider px-1 rounded border ${t.cls}`}>{t.label}</span>
                <span className="text-gray-300">{host}</span>
                <ExternalLink size={9} className="text-gray-500" />
              </a>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default function DistrictDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = use(params);
  // URL like /districts/chennai or /districts/Chennai — normalize for API
  const districtName = decodeURIComponent(rawName);

  const [district, setDistrict]   = useState<DistrictRow | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API}/api/stats/districts`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/incidents/?district=${encodeURIComponent(districtName)}&limit=100`, { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
    ]).then(([dist, inc]) => {
      if (cancelled) return;
      if (dist) {
        // Case-insensitive match because URL may have any casing
        const match = (dist.districts || []).find((d: DistrictRow) =>
          d.district.toLowerCase() === districtName.toLowerCase()
        );
        if (match) setDistrict(match);
      }
      setIncidents(Array.isArray(inc) ? inc : []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [districtName]);

  const cardZoneColor = zoneStyle(district?.zone_7d ?? 'Tense');

  return (
    <main className="flex-1 p-3 sm:p-6 max-w-4xl mx-auto w-full">
      <Link href="/districts" className="text-gray-500 hover:text-white text-xs inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={11} /> Back to all districts
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <MapPin size={24} className="text-orange-400" />
          {district?.district ?? districtName}
        </h1>
        {district && (
          <div className="flex items-baseline gap-4 mt-2 flex-wrap">
            <div>
              <span className={`text-4xl font-bold tabular-nums ${cardZoneColor}`}>{district.score_7d.toFixed(0)}</span>
              <span className="text-xs text-gray-500 ml-2">/100</span>
            </div>
            <span className={`text-sm uppercase tracking-wider font-medium ${cardZoneColor}`}>
              {district.zone_7d}
            </span>
            <span className="text-xs text-gray-500">
              last 7 days · {district.incidents_7d} incident{district.incidents_7d === 1 ? '' : 's'}
            </span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">
              last 30 days · {district.incidents_30d} incident{district.incidents_30d === 1 ? '' : 's'} · score {district.score_30d.toFixed(0)}
            </span>
          </div>
        )}
      </header>

      <section className="mb-5 bg-[#15161c] border border-[#262833] rounded-lg p-4">
        <h2 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
          <Activity size={14} className="text-orange-400" />
          What's happening here
          <span className="text-gray-600 text-xs font-normal">
            ({incidents.length} reported incident{incidents.length === 1 ? '' : 's'})
          </span>
        </h2>
        <p className="text-gray-500 text-[11px] leading-relaxed">
          Every incident below has been verified against press sources. Click any
          source badge to read the original report. Sentiment tags (
          <span className="text-red-400">critical</span> /
          <span className="text-emerald-400"> favourable</span> /
          <span className="text-gray-400"> neutral</span>) reflect the tone of
          press coverage, not our editorial view.
        </p>
      </section>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#15161c] border border-[#262833] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && incidents.length === 0 && (
        <div className="bg-[#15161c] border border-[#262833] rounded-lg p-6 text-center">
          <MessageSquare size={24} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400 text-sm">No reported incidents in this district yet.</p>
        </div>
      )}

      {!loading && incidents.length > 0 && (
        <div className="space-y-3">
          {incidents.map(inc => <IncidentCard key={inc.id} inc={inc} />)}
        </div>
      )}
    </main>
  );
}
