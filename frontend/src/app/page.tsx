import StatCard from '@/components/StatCard';
import TopBar from '@/components/TopBar';
import IncidentCard from '@/components/IncidentCard';
import BaselineDelta from '@/components/BaselineDelta';
import { DashboardStats, Incident, BaselineRow } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/constants';
import {
  DollarSign, Skull, ShieldAlert, Users, CheckSquare, Copy, AlertTriangle,
  Zap, ZapOff, Wine, Megaphone, ShieldOff,
} from 'lucide-react';

// Fallback mock data — shown when API is not yet connected
const MOCK_STATS: DashboardStats = {
  govt_day: Math.floor((Date.now() - new Date('2026-05-11').getTime()) / 86400000) + 1,
  corruption_count: 0,
  murders_count: 0,
  sexual_assault_count: 0,
  crimes_women_kids_count: 0,
  credit_steal_count: 0,
  promises_kept: 0,
  promises_total: 20,
  total_incidents: 0,
};

const MOCK_INCIDENTS: Incident[] = [
  {
    id: '1',
    title: "Example: TVK claims credit for DMK's Kalaignar Magalir Urimai Thittam",
    summary: "TVK minister announced expanded women's welfare scheme without acknowledging it was launched by the previous DMK administration under CM Stalin in 2023 with ₹1000/month payout.",
    category: 'credit_stealing',
    incident_date: '2026-05-15',
    location: 'Chennai',
    source_urls: ['https://example.com'],
    is_credit_steal: true,
    original_credit: 'Kalaignar Magalir Urimai Thittam launched by DMK government in Sept 2023',
    severity: 3,
    ai_confidence: 0.91,
    status: 'approved',
    created_at: new Date().toISOString(),
  },
];

const ALL_CATEGORIES = Object.entries(CATEGORY_LABELS);

async function getStats(): Promise<DashboardStats> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/stats/dashboard`,
      { cache: 'no-store', signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return MOCK_STATS;
    return res.json();
  } catch {
    return MOCK_STATS;
  }
}

async function getRecentIncidents(): Promise<Incident[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/incidents/?limit=6`,
      { cache: 'no-store', signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return MOCK_INCIDENTS;
    const data = await res.json();
    return data.length ? data : MOCK_INCIDENTS;
  } catch {
    return MOCK_INCIDENTS;
  }
}

async function getBaselines(): Promise<BaselineRow[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/baselines/dashboard`,
      { cache: 'no-store', signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [stats, incidents, baselines] = await Promise.all([
    getStats(),
    getRecentIncidents(),
    getBaselines(),
  ]);

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
        </div>

        {/* Trending / hot categories — Power Cut, EB Failure are top right now */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          <StatCard label="Power Cut" value={stats.power_cut_count ?? 0} icon={ZapOff} color="text-amber-400" />
          <StatCard label="EB Failure" value={stats.eb_failure_count ?? 0} icon={Zap} color="text-yellow-400" />
          <StatCard label="Alcohol Menace" value={stats.alcohol_menace_count ?? 0} icon={Wine} color="text-pink-400" />
          <StatCard label="Police Excess" value={stats.police_excess_count ?? 0} icon={ShieldOff} color="text-red-400" />
          <StatCard label="Fake News" value={stats.fake_news_count ?? 0} icon={Megaphone} color="text-fuchsia-400" />
        </div>

        {/* Crime stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Corruption" value={stats.corruption_count} icon={DollarSign} color="text-yellow-400" />
          <StatCard label="Murders" value={stats.murders_count} icon={Skull} color="text-red-500" />
          <StatCard label="Sexual Assaults" value={stats.sexual_assault_count} icon={ShieldAlert} color="text-red-400" />
          <StatCard label="Crimes vs Children" value={stats.crimes_women_kids_count} icon={Users} color="text-orange-400" />
          <StatCard
            label="Promises Kept"
            value={stats.promises_kept}
            sub={`/${stats.promises_total}`}
            icon={CheckSquare}
            color="text-green-400"
          />
        </div>

        {/* DMK era vs TVK era delta panel */}
        {baselines.length > 0 && <BaselineDelta rows={baselines} />}

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

        {/* Recent incidents */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-400" />
            Recent Incidents
          </h2>
          <a href="/incidents" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
            View all →
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.map(incident => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>

        {incidents === MOCK_INCIDENTS && (
          <p className="text-center text-gray-700 text-xs mt-8">
            Showing demo data — connect your Supabase backend to see live incidents
          </p>
        )}
      </main>
    </>
  );
}
