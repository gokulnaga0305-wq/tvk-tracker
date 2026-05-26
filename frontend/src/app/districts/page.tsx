'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin, AlertTriangle, Activity, RefreshCw, Info, LayoutGrid, Map as MapIcon,
  ChevronRight,
} from 'lucide-react';
import TamilNaduMap from '@/components/TamilNaduMap';

/**
 * /districts — District Mood page.
 *
 * Lets you see, per Tamil Nadu district:
 *   - How angry citizens probably are right now (0=very angry, 100=quiet)
 *   - Top 3-4 issues driving the mood
 *   - Last incident date in that district
 *
 * Toggle between 7-day window (recent intensity) and 30-day (medium-term).
 * Toggle between grid view (sortable cards) and map view (TN choropleth).
 *
 * No jargon — uses plain English zone labels: Very angry / Angry / Tense /
 * Calm / Quiet.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

interface DistrictsResponse {
  as_of: string;
  districts: DistrictRow[];
  totals: {
    districts_tracked: number;
    with_incidents_7d: number;
    with_incidents_30d: number;
  };
}

// Plain-English category labels for the "top issues" line on each card
const CATEGORY_LABELS: Record<string, string> = {
  corruption:        'Corruption',
  murders:           'Murders',
  sexual_assault:    'Sexual assaults',
  crimes_women_kids: 'Crimes vs women/kids',
  power_cut:         'Power cuts',
  water_shortage:    'Water shortage',
  honour_killing:    'Honour killings',
  custodial_death:   'Custodial deaths',
  police_excess:     'Police excess',
  broken_promise:    'Broken promises',
  partial_promise:   'Partial promises',
  kept_promise:      'Promises kept',
  new_initiative:    'New initiatives',
  alcohol_menace:    'Alcohol issues',
  governance:        'Governance gaps',
  civic_failure:     'Civic failures',
  fake_news:         'Fake news',
  eb_failure:        'EB failures',
  attack_on_press:   'Press attacks',
  credit_stealing:   'Credit stealing',
  communal_violence: 'Communal violence',
  other:             'Other',
};

function zoneStyle(zone: string) {
  switch (zone) {
    case 'Very angry': return { bg: 'bg-red-950/40',     border: 'border-red-700/50',     text: 'text-red-300',     accent: '#ef4444' };
    case 'Angry':      return { bg: 'bg-orange-950/40',  border: 'border-orange-700/50',  text: 'text-orange-300',  accent: '#fb923c' };
    case 'Tense':      return { bg: 'bg-yellow-950/30',  border: 'border-yellow-800/40',  text: 'text-yellow-300',  accent: '#facc15' };
    case 'Calm':       return { bg: 'bg-lime-950/30',    border: 'border-lime-800/40',    text: 'text-lime-300',    accent: '#a3e635' };
    case 'Quiet':      return { bg: 'bg-emerald-950/20', border: 'border-emerald-900/30', text: 'text-emerald-300', accent: '#10b981' };
    default:           return { bg: 'bg-[#15161c]',      border: 'border-[#262833]',     text: 'text-gray-400',    accent: '#6b7280' };
  }
}

function DistrictCard({ d, window }: { d: DistrictRow; window: '7d' | '30d' }) {
  const score = window === '7d' ? d.score_7d : d.score_30d;
  const zone  = window === '7d' ? d.zone_7d  : d.zone_30d;
  const count = window === '7d' ? d.incidents_7d : d.incidents_30d;
  const cats  = window === '7d' ? d.top_categories_7d : d.top_categories_30d;
  const style = zoneStyle(zone);
  const hasIncidents = (d.incidents_30d ?? 0) > 0;

  // Only districts with at least one incident are clickable — others
  // would just land on an empty page.
  const inner = (
    <>
      <header className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-white font-semibold text-sm leading-tight flex items-center gap-1">
          {d.district}
          {hasIncidents && <ChevronRight size={11} className="text-gray-500" />}
        </h3>
        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${style.text}`}>
          {zone}
        </span>
      </header>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-3xl font-bold tabular-nums ${style.text}`}>{score.toFixed(0)}</span>
        <span className="text-[10px] text-gray-500">
          {count > 0 ? `${count} incident${count > 1 ? 's' : ''} in last ${window === '7d' ? '7' : '30'}d` : 'no recent incidents'}
        </span>
      </div>
      {cats.length > 0 ? (
        <ul className="text-[11px] text-gray-400 space-y-0.5">
          {cats.slice(0, 3).map(c => (
            <li key={c.category} className="flex items-center gap-1.5">
              <span className="text-gray-600">·</span>
              <span>{CATEGORY_LABELS[c.category] ?? c.category}</span>
              <span className="text-gray-500">×{c.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-gray-600 italic">No reported issues</p>
      )}
      {d.last_incident_date && (
        <p className="text-[10px] text-gray-600 mt-2">
          Last: {new Date(d.last_incident_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      )}
    </>
  );

  if (hasIncidents) {
    return (
      <Link
        href={`/districts/${encodeURIComponent(d.district)}`}
        className={`block rounded-lg border p-4 hover:scale-[1.02] hover:brightness-110 transition-transform ${style.bg} ${style.border}`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <article className={`rounded-lg border p-4 ${style.bg} ${style.border} opacity-70`}>
      {inner}
    </article>
  );
}

export default function DistrictsPage() {
  const [data, setData] = useState<DistrictsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow]   = useState<'7d' | '30d'>('7d');
  const [view, setView]       = useState<'grid' | 'map'>('grid');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/stats/districts`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as DistrictsResponse;
        if (!cancelled) setData(j);
      } catch { /* fail silent */ }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);   // 5-min refresh
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.districts].sort((a, b) =>
      window === '7d' ? a.score_7d - b.score_7d : a.score_30d - b.score_30d
    );
  }, [data, window]);

  return (
    <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPin size={22} className="text-orange-400" />
          District Mood
        </h1>
        <p className="text-gray-500 text-sm mt-1 max-w-2xl leading-relaxed">
          How angry each Tamil Nadu district probably is right now, based on the
          incidents reported there. Lower score = angrier. Click any district
          for a full incident list. Updates every 5 minutes.
        </p>
      </div>

      {/* Window + view toggles */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 bg-[#15161c] border border-[#262833] rounded-md p-0.5">
          <button
            onClick={() => setWindow('7d')}
            className={`px-3 py-1.5 text-xs font-medium rounded ${window === '7d' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Last 7 days
          </button>
          <button
            onClick={() => setWindow('30d')}
            className={`px-3 py-1.5 text-xs font-medium rounded ${window === '30d' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Last 30 days
          </button>
        </div>
        <div className="flex gap-1 bg-[#15161c] border border-[#262833] rounded-md p-0.5">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-1.5 text-xs font-medium rounded inline-flex items-center gap-1 ${view === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <LayoutGrid size={11} /> Grid
          </button>
          <button
            onClick={() => setView('map')}
            className={`px-3 py-1.5 text-xs font-medium rounded inline-flex items-center gap-1 ${view === 'map' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <MapIcon size={11} /> Map
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {data && (
        <div className="bg-[#15161c] border border-[#262833] rounded-lg px-4 py-2.5 mb-5 flex items-center gap-4 flex-wrap text-[11px]">
          <span className="text-gray-400">
            Tracking <strong className="text-white">{data.totals.districts_tracked}</strong> districts ·
            <strong className="text-white"> {window === '7d' ? data.totals.with_incidents_7d : data.totals.with_incidents_30d}</strong> with recent incidents
          </span>
          <span className="ml-auto text-gray-600 flex items-center gap-1">
            <RefreshCw size={10} /> live · 5-min refresh
          </span>
        </div>
      )}

      {/* Empty / loading states */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#15161c] border border-[#262833] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && data && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sorted.map(d => <DistrictCard key={d.district} d={d} window={window} />)}
        </div>
      )}

      {!loading && data && view === 'map' && (
        <TamilNaduMap districts={data.districts} window={window} categoryLabels={CATEGORY_LABELS} />
      )}

      {!loading && data && data.totals.with_incidents_30d === 0 && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-4 mt-5 text-amber-300 text-sm flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0" />
          <div>
            <strong>No district data yet.</strong> Apply migration <code className="bg-black/30 px-1 rounded mx-1">database/015_district_column.sql</code> in Supabase + run the backfill script <code className="bg-black/30 px-1 rounded mx-1">scripts/backfill_districts.py</code> to populate. New incidents auto-tag from now on.
          </div>
        </div>
      )}
    </main>
  );
}
