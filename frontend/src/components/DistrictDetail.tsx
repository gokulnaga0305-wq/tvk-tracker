'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, Scale, ShieldAlert, Users, MapPin, Clock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PARTY: Record<string, string> = {
  TVK: '#eab308', 'DMK+': '#ef4444', 'ADMK+': '#16a34a', NTK: '#fde047', OTHERS: '#6b7280', NOTA: '#52525b',
  DMK: '#ef4444', ADMK: '#16a34a', AIADMK: '#16a34a', INC: '#38bdf8',
  BJP: '#f97316', PMK: '#a3a3a3', VCK: '#3b82f6', CPI: '#dc2626', 'CPI(M)': '#dc2626',
  IUML: '#22c55e', DMDK: '#facc15', AMMK: '#84cc16',
};
const pcol = (p?: string | null) => (p && PARTY[p]) || '#6b7280';

interface Cand {
  name: string; party: string; alliance: string; gender: string; age: number;
  assets_text: string; assets_cr: number; criminal: boolean; result: string;
}
interface BoothSummary {
  total_booths: number; booth_wins: Record<string, number>;
  party_totals: Record<string, number>; strongholds: number; swing_booths: number;
}
interface Con {
  ac_no: number; ac_name: string; winner_2021: string; winner_2026: string;
  flipped: boolean; electors: number; female_share: number; candidates_list?: Cand[];
  booth_summary?: BoothSummary | null;
}
interface Detail {
  district: string; found: boolean; seats: number; flips: number;
  constituencies: Con[];
  candidate_stats: null | {
    candidates: number; women: number; criminal: number; criminal_pct: number;
    avg_age: number; avg_assets_cr: number; winners_total: number;
    winners_with_criminal: number; women_winners: number;
  };
  booth_status: { available: boolean; note: string; acs_with_booths?: number; acs_total?: number; total_booths?: number };
}

export default function DistrictDetail({ district }: { district: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/election/district/${encodeURIComponent(district)}`)
      .then(r => r.json()).then(setD).catch(() => setD(null)).finally(() => setLoading(false));
  }, [district]);

  if (loading) return <div className="text-gray-500 py-20 text-center">Loading {district}…</div>;
  if (!d || !d.found) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-gray-400">No data for “{district}”.</p>
      <Link href="/election-insights" className="text-orange-400 text-sm mt-3 inline-block">← Back to Election Insights</Link>
    </div>
  );

  const cs = d.candidate_stats;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/election-insights" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4">
        <ArrowLeft size={15} /> All districts
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <MapPin className="text-orange-500" size={24} />
        <h1 className="text-2xl font-bold text-white">{d.district}</h1>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        {d.seats} constituencies · <span className="text-orange-400">{d.flips} flipped</span> in 2026.
      </p>

      {/* Candidate insight strip (populates once profiles are ingested) */}
      {cs ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          <Stat icon={Users} label="Candidates" value={`${cs.candidates}`} sub={`${cs.women} women`} />
          <Stat icon={ShieldAlert} label="Winners w/ criminal cases"
                value={`${cs.winners_with_criminal}/${cs.winners_total}`} accent="text-red-400" />
          <Stat icon={Scale} label="Avg declared assets" value={cs.avg_assets_cr != null ? `₹${cs.avg_assets_cr} Cr` : '—'} />
          <Stat icon={Users} label="Avg candidate age" value={cs.avg_age != null ? `${cs.avg_age}` : '—'} sub="years" />
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 text-xs text-gray-500 mb-7">
          Candidate-profile insights (criminal cases, assets, age) load once the candidate dataset is ingested.
        </div>
      )}

      {/* Constituencies */}
      <h2 className="text-sm font-semibold text-gray-200 mb-3">Constituencies</h2>
      <div className="space-y-2 mb-8">
        {d.constituencies.map(c => {
          const winner = c.candidates_list?.find(x => x.result === 'won');
          return (
            <div key={c.ac_no} className="bg-[#111] border border-[#222] rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-100 font-medium">{c.ac_name}</span>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  <span style={{ color: pcol(c.winner_2021) }}>{c.winner_2021}</span>
                  <ArrowRightLeft size={11} className="text-gray-600" />
                  <span className="font-semibold" style={{ color: pcol(c.winner_2026) }}>{c.winner_2026}</span>
                  {c.flipped && <span className="text-[9px] bg-orange-600/20 text-orange-300 px-1.5 py-0.5 rounded">FLIP</span>}
                </div>
              </div>
              <div className="text-[10px] text-gray-600 mt-1">
                {(c.electors || 0).toLocaleString('en-IN')} electors
                {c.female_share != null && <> · {c.female_share}% women</>}
                {winner && <> · won by <span className="text-gray-400">{winner.name}</span>
                  {winner.criminal && <span className="ml-1 text-red-400">⚠ criminal case</span>}
                  {winner.assets_text && <span className="text-gray-500"> · {winner.assets_text}</span>}</>}
              </div>

              {/* Booth-level insight (Form 20) */}
              {c.booth_summary && (
                <div className="mt-2.5 pt-2.5 border-t border-[#1c1c1c]">
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="text-gray-400 font-medium">
                      {c.booth_summary.total_booths} booths
                      <span className="text-gray-600"> · Form 20</span>
                    </span>
                    <span className="text-gray-600">
                      {c.booth_summary.strongholds} strongholds · {c.booth_summary.swing_booths} swing
                    </span>
                  </div>
                  {/* booth-wins bar */}
                  <div className="flex gap-0.5 h-2 rounded overflow-hidden">
                    {Object.entries(c.booth_summary.booth_wins).map(([p, n]) => (
                      <div key={p} title={`${p} led ${n} booths`}
                        style={{ width: `${(n / c.booth_summary!.total_booths) * 100}%`, background: pcol(p) }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-gray-500">
                    {Object.entries(c.booth_summary.booth_wins).map(([p, n]) => (
                      <span key={p}><span style={{ color: pcol(p) }}>●</span> {p} led {n}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Booth-level status */}
      <div className={`rounded-lg p-5 ${d.booth_status.available
        ? 'bg-emerald-950/15 border border-emerald-800/40' : 'bg-[#141414] border border-dashed border-[#333]'}`}>
        <div className="flex items-center gap-2 text-gray-200 font-semibold text-sm mb-2">
          {d.booth_status.available
            ? <MapPin size={15} className="text-emerald-400" />
            : <Clock size={15} className="text-amber-400" />}
          Booth-level analysis (Form 20)
        </div>
        {d.booth_status.available ? (
          <p className="text-xs text-gray-400 leading-relaxed">
            <b className="text-white">{d.booth_status.total_booths?.toLocaleString('en-IN')} booths</b> loaded
            across <b className="text-white">{d.booth_status.acs_with_booths} of {d.booth_status.acs_total}</b> constituencies,
            straight from ECI Form 20 — each constituency&apos;s booth-wins, strongholds and swing booths shown above.
            Every AC&apos;s booth votes were validated against its official winner; nothing is estimated.
            Remaining ACs load as their Form 20 is published.
          </p>
        ) : (
          <p className="text-xs text-gray-500 leading-relaxed">
            {d.booth_status.note} Sourced strictly from ECI Form 20 — real booth data only, nothing estimated.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-lg px-4 py-3">
      <Icon size={15} className="text-gray-600 mb-1" />
      <div className={`text-lg font-bold ${accent || 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-gray-500 leading-tight">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}
