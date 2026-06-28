'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, MapPin, Trophy, Swords } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PARTY: Record<string, string> = {
  TVK: '#eab308', 'DMK+': '#ef4444', 'ADMK+': '#16a34a', NTK: '#fde047', OTHERS: '#6b7280', NOTA: '#52525b',
};
const pcol = (p?: string | null) => (p && PARTY[p]) || '#6b7280';
const COLS = ['TVK', 'DMK+', 'ADMK+', 'NTK', 'OTHERS'];

interface Booth { booth_no: number; total: number; parties: Record<string, number>; winner: string | null; }
interface Data {
  ac_no: number; ac_name: string; available: boolean; source?: string;
  summary?: { total_booths: number; booth_wins: Record<string, number>;
    party_totals: Record<string, number>; strongholds: number; swing_booths: number };
  booths?: Booth[];
}

export default function BoothDetail({ acNo, district }: { acNo: number; district?: string }) {
  const backHref = district ? `/election-insights/${encodeURIComponent(district)}` : '/election-insights';
  const backLabel = district || 'Election Insights';
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<string>('booth_no');

  useEffect(() => {
    fetch(`${API}/api/election/booths/${acNo}`)
      .then(r => r.json()).then(setD).catch(() => setD(null)).finally(() => setLoading(false));
  }, [acNo]);

  const booths = useMemo(() => {
    if (!d?.booths) return [];
    let rows = d.booths;
    if (q.trim()) rows = rows.filter(b => String(b.booth_no).includes(q.trim()));
    rows = [...rows].sort((a, b) =>
      sort === 'booth_no' ? a.booth_no - b.booth_no
        : (b.parties[sort] || 0) - (a.parties[sort] || 0));
    return rows;
  }, [d, q, sort]);

  if (loading) return <div className="text-gray-500 py-20 text-center">Loading booths…</div>;
  if (!d || !d.available) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-gray-400">Booth-level data not available for this constituency yet.</p>
      <Link href="/election-insights" className="text-orange-400 text-sm mt-3 inline-block">← Election Insights</Link>
    </div>
  );

  const s = d.summary!;
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4">
        <ArrowLeft size={15} /> {backLabel}
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="text-orange-500" size={22} />
        <h1 className="text-2xl font-bold text-white">{d.ac_name}</h1>
        <span className="text-gray-500 text-sm">AC {d.ac_no}</span>
      </div>
      <p className="text-gray-500 text-xs mb-5">{s.total_booths} polling booths · {d.source}</p>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#111] border border-[#222] rounded-lg px-4 py-3">
          <Trophy size={14} className="text-gray-600 mb-1" />
          <div className="text-xs text-gray-400 mb-1">Booths led</div>
          {Object.entries(s.booth_wins).map(([p, n]) => (
            <div key={p} className="text-[11px]"><span style={{ color: pcol(p) }}>●</span> {p}: {n}</div>
          ))}
        </div>
        <Stat icon={Trophy} label="Strongholds" value={`${s.strongholds}`} sub="led by 30%+" accent="text-emerald-400" />
        <Stat icon={Swords} label="Swing booths" value={`${s.swing_booths}`} sub="decided by ≤5%" accent="text-amber-400" />
        <div className="bg-[#111] border border-[#222] rounded-lg px-4 py-3">
          <div className="text-xs text-gray-400 mb-1">Total votes</div>
          {COLS.filter(p => s.party_totals[p]).map(p => (
            <div key={p} className="text-[11px]"><span style={{ color: pcol(p) }}>●</span> {p}: {(s.party_totals[p]).toLocaleString('en-IN')}</div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-600" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find booth #…"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-600/50" />
        </div>
        <span className="text-[11px] text-gray-600">sort:</span>
        {['booth_no', ...COLS].map(c => (
          <button key={c} onClick={() => setSort(c)}
            className={`text-[11px] px-2 py-1 rounded border ${sort === c ? 'bg-orange-600/20 text-orange-300 border-orange-600/50' : 'text-gray-400 border-[#2a2a2a] hover:text-gray-200'}`}>
            {c === 'booth_no' ? 'Booth #' : c}
          </button>
        ))}
      </div>

      {/* Booth table */}
      <div className="overflow-x-auto border border-[#222] rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-[#161616] text-gray-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Booth</th>
              {COLS.map(c => <th key={c} className="text-right px-2 py-2 font-medium" style={{ color: pcol(c) }}>{c}</th>)}
              <th className="text-right px-2 py-2 font-medium">Total</th>
              <th className="text-left px-3 py-2 font-medium">Winner</th>
            </tr>
          </thead>
          <tbody>
            {booths.map(b => (
              <tr key={b.booth_no} className="border-t border-[#1c1c1c] hover:bg-[#141414]">
                <td className="px-3 py-1.5 text-gray-300 font-medium">{b.booth_no}</td>
                {COLS.map(c => (
                  <td key={c} className="px-2 py-1.5 text-right text-gray-400"
                      style={b.winner === c ? { color: pcol(c), fontWeight: 600 } : undefined}>
                    {b.parties[c] ?? 0}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right text-gray-500">{(b.total || 0).toLocaleString('en-IN')}</td>
                <td className="px-3 py-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-black" style={{ background: pcol(b.winner) }}>{b.winner}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-600 mt-2">Showing {booths.length} of {d.booths!.length} booths. Winner-highlighted column = booth winner.</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-lg px-4 py-3">
      <Icon size={14} className="text-gray-600 mb-1" />
      <div className={`text-lg font-bold ${accent || 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
      {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
    </div>
  );
}
