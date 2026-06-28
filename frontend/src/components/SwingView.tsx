'use client';
import { useState, useEffect, useMemo } from 'react';
import { TrendingDown, ArrowRightLeft, Search } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PARTY: Record<string, string> = {
  TVK: '#eab308', 'DMK+': '#ef4444', 'ADMK+': '#16a34a', NTK: '#fde047', OTHERS: '#6b7280',
};
const pcol = (p?: string | null) => (p && PARTY[p]) || '#6b7280';

interface Con {
  ac_no: number; ac_name: string; district: string;
  winner_2021_party: string; winner_2026_party: string; flipped: boolean;
  swing: Record<string, number> | null;
}
interface Swing {
  statewide: { y2021: Record<string, number>; y2026: Record<string, number>; swing: Record<string, number> };
  constituencies: Con[];
  with_voteshare: number;
  note: string;
}

export default function SwingView() {
  const [d, setD] = useState<Swing | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<'DMK+' | 'TVK' | 'ADMK+'>('DMK+');

  useEffect(() => {
    fetch(`${API}/api/election/swing`).then(r => r.json()).then(setD).catch(() => setD(null)).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    if (!d) return [];
    let r = d.constituencies.filter(c => c.swing);
    if (q.trim()) {
      const t = q.toLowerCase();
      r = r.filter(c => c.ac_name?.toLowerCase().includes(t) || c.district?.toLowerCase().includes(t));
    }
    return [...r].sort((a, b) => (a.swing![sortBy] ?? 0) - (b.swing![sortBy] ?? 0)); // most negative first
  }, [d, q, sortBy]);

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading swing…</div>;
  if (!d) return null;

  const sw = d.statewide.swing;
  const blocs: [string, number, number, number][] = [
    ['DMK+', d.statewide.y2021['DMK+'] || 0, d.statewide.y2026['DMK+'] || 0, sw['DMK+'] || 0],
    ['ADMK+', d.statewide.y2021['ADMK+'] || 0, d.statewide.y2026['ADMK+'] || 0, sw['ADMK+'] || 0],
    ['TVK', 0, d.statewide.y2026['TVK'] || 0, sw['TVK'] || 0],
  ];

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
        <ArrowRightLeft size={15} className="text-orange-400" /> 2021 → 2026: where the holds shifted
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Full vote-count comparison (not a survey). Both Dravidian fronts bled ~13 points; TVK rose by pulling from both.
      </p>

      {/* statewide swing */}
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {blocs.map(([b, y21, y26, s]) => (
          <div key={b} className="bg-[#111] border border-[#222] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: pcol(b) }}>{b}</span>
              <span className={`text-lg font-bold ${s < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {s > 0 ? '+' : ''}{s.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span>{b === 'TVK' ? '—' : `${y21.toFixed(1)}%`}</span>
              <span className="text-gray-700">→</span>
              <span className="text-gray-300">{y26.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-1.5 bg-[#1a1a1a] rounded overflow-hidden flex">
              <div className="h-full" style={{ width: `${y26 * 2}%`, background: pcol(b) }} />
            </div>
          </div>
        ))}
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-600" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search constituency / district…"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-600/50" />
        </div>
        <span className="text-[11px] text-gray-600">rank by loss:</span>
        {(['DMK+', 'ADMK+', 'TVK'] as const).map(s => (
          <button key={s} onClick={() => setSortBy(s)}
            className={`text-[11px] px-2 py-1 rounded border ${sortBy === s ? 'bg-orange-600/20 text-orange-300 border-orange-600/50' : 'text-gray-400 border-[#2a2a2a] hover:text-gray-200'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* per-AC swing table */}
      <div className="overflow-x-auto border border-[#222] rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-[#161616] text-gray-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Constituency</th>
              <th className="text-left px-3 py-2 font-medium">District</th>
              <th className="text-left px-3 py-2 font-medium">2021 → 2026</th>
              <th className="text-right px-2 py-2 font-medium" style={{ color: pcol('DMK+') }}>DMK+ swing</th>
              <th className="text-right px-2 py-2 font-medium" style={{ color: pcol('ADMK+') }}>ADMK+ swing</th>
              <th className="text-right px-2 py-2 font-medium" style={{ color: pcol('TVK') }}>TVK swing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.ac_no} className="border-t border-[#1c1c1c] hover:bg-[#141414]">
                <td className="px-3 py-1.5 text-gray-200">{c.ac_name}</td>
                <td className="px-3 py-1.5 text-gray-500">{c.district}</td>
                <td className="px-3 py-1.5">
                  <span style={{ color: pcol(c.winner_2021_party) }}>{c.winner_2021_party}</span>
                  <span className="text-gray-600 mx-1">→</span>
                  <span className="font-semibold" style={{ color: pcol(c.winner_2026_party) }}>{c.winner_2026_party}</span>
                  {c.flipped && <span className="ml-1.5 text-[9px] bg-orange-600/20 text-orange-300 px-1 py-0.5 rounded">FLIP</span>}
                </td>
                {(['DMK+', 'ADMK+', 'TVK'] as const).map(b => (
                  <td key={b} className="px-2 py-1.5 text-right font-medium"
                      style={{ color: (c.swing![b] ?? 0) < 0 ? '#f87171' : '#34d399' }}>
                    {(c.swing![b] ?? 0) > 0 ? '+' : ''}{(c.swing![b] ?? 0).toFixed(0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-600 mt-2 flex items-center gap-1">
        <TrendingDown size={11} /> Full vote-share swing shown for <b className="text-gray-400">&nbsp;{d.with_voteshare} of 234&nbsp;</b> ACs
        (booth-level Form 20 loaded). Seat-flips are confirmed for all 234. {d.note.split('.').pop()}
      </p>
    </div>
  );
}
