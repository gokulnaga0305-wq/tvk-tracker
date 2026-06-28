'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Vote, ArrowRightLeft, Users, TrendingDown, Search, Code2, ExternalLink, ChevronRight, Info } from 'lucide-react';
import SwingView from './SwingView';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Party palette (kept muted to read on the dark theme).
const PARTY: Record<string, string> = {
  // 5-player buckets (used in all aggregates)
  TVK: '#eab308', 'DMK+': '#ef4444', 'ADMK+': '#16a34a', NTK: '#fde047', OTHERS: '#6b7280', NOTA: '#52525b',
  // individual party codes (constituency-level winner labels)
  DMK: '#ef4444', ADMK: '#16a34a', AIADMK: '#16a34a', INC: '#38bdf8', BJP: '#f97316',
  PMK: '#a3a3a3', VCK: '#3b82f6', CPI: '#dc2626', 'CPI(M)': '#dc2626', IUML: '#22c55e', DMDK: '#facc15', AMMK: '#84cc16',
};
const pcol = (p?: string | null) => (p && PARTY[p]) || '#6b7280';

interface Summary {
  total_seats: number;
  seats_2026: Record<string, number>;
  seats_2021: Record<string, number>;
  flips_2021_to_2026: number;
  electors: { total: number; male: number; female: number; third: number };
  eci_state: {
    turnout_pct: number; registered_electors: number;
    parties: { party: string; votes: number; vote_share: number; swing: number | null; seats: number }[];
    alliances: { alliance: string; vote_share: number; seats: number }[];
    turnout_by_gender?: { male: number; female: number; third: number };
    source: string;
  };
  credits: { method: string; analysis_inspiration: string; results_data: string };
  honest_note: string;
}
interface Con {
  ac_no: number; ac_name: string; district: string; category: string;
  electors: number; electors_female: number; candidates_count: number;
  winner_2021: string; winner_2026: string; flipped: boolean; female_share: number | null;
}
interface Dist {
  district: string; seats: number; seats_2026: Record<string, number>;
  electors: number; female_share: number | null; lead_party: string | null;
}

const fmt = (n: number) => n.toLocaleString('en-IN');

export default function ElectionInsights() {
  const [s, setS] = useState<Summary | null>(null);
  const [cons, setCons] = useState<Con[]>([]);
  const [dists, setDists] = useState<Dist[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'flipped'>('all');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/election/summary`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/election/constituencies`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/election/districts`).then(r => r.json()).catch(() => []),
    ]).then(([su, c, d]) => {
      setS(su); setCons(Array.isArray(c) ? c : []); setDists(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  const shownCons = useMemo(() => {
    let rows = cons;
    if (filter === 'flipped') rows = rows.filter(c => c.flipped);
    if (q.trim()) {
      const t = q.toLowerCase();
      rows = rows.filter(c => c.ac_name?.toLowerCase().includes(t) || c.district?.toLowerCase().includes(t));
    }
    return rows;
  }, [cons, q, filter]);

  if (loading) return <div className="text-gray-500 py-20 text-center">Loading election data…</div>;
  if (!s) return <div className="text-gray-500 py-20 text-center">Election data unavailable.</div>;

  const maxSeat = Math.max(...Object.values(s.seats_2026));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <Vote className="text-orange-500 mt-1 shrink-0" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Election Insights — 2026 TN Assembly</h1>
          <p className="text-gray-400 text-sm mt-1">
            What the result actually says, district by district. Observed data only —
            this is post-result analysis, not a fraud claim.
          </p>
        </div>
      </div>

      {/* Honest banner */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 text-xs text-gray-400 my-5 leading-relaxed">
        <span className="text-gray-200 font-semibold">Read this straight.</span>{' '}
        DMK fell from <b className="text-white">133 → 59</b> seats; TVK rose from{' '}
        <b className="text-white">0 → 108</b>. <b className="text-white">{s.flips_2021_to_2026} of {s.total_seats}</b>{' '}
        seats changed hands — a genuine anti-incumbent wave. We show it as it is; that honesty is
        what makes the rest of this dashboard credible. Seat figures match ECI final
        (TVK 108 / DMK 59 / AIADMK 47).
      </div>

      {/* What Form 20 can and can't tell you — the methodological frame */}
      <div className="bg-emerald-950/15 border border-emerald-800/40 rounded-lg p-5 my-6">
        <h2 className="text-emerald-200 font-semibold mb-3 flex items-center gap-2">
          <Info size={16} className="text-emerald-400" />
          What Form 20 can — and can&apos;t — tell you
        </h2>
        <div className="text-sm text-gray-300 leading-relaxed space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-[#101810] border border-emerald-900/40 rounded p-3">
              <div className="text-emerald-300 text-xs font-semibold mb-1">✓ What it shows</div>
              <p className="text-xs text-gray-400">How many votes each candidate got <b className="text-gray-200">in each polling booth</b>. That is the entire content — how a <em>place</em> voted.</p>
            </div>
            <div className="bg-[#181010] border border-red-900/40 rounded p-3">
              <div className="text-red-300 text-xs font-semibold mb-1">✗ What it does NOT show</div>
              <p className="text-xs text-gray-400">The <b className="text-gray-200">religion, caste, gender or age</b> of who voted. The ballot is secret — there is no record of how any <em>group</em> voted.</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            So a claim like <span className="text-gray-200">&ldquo;Form 20 shows community X voted 70–95% for party Y&rdquo;</span> is{' '}
            <b className="text-white">not what Form 20 says</b>. It&apos;s guessed from how booths in that community&apos;s
            areas voted — the <em>ecological fallacy</em>: those booths hold everyone else too, and you can&apos;t separate
            one group&apos;s ballots. A precise bloc figure — or a wide &ldquo;70–95%&rdquo; range stated as fact — pinned on
            &ldquo;Form 20&rdquo; is the giveaway.
          </p>
          <p className="text-xs text-gray-400">
            <b className="text-gray-200">What is fair:</b> post-poll <b className="text-gray-200">surveys</b> (CSDS-Lokniti, Axis)
            actually interview voters and <em>do</em> estimate vote-by-community, with a margin of error. In Tamil Nadu those
            surveys have long shown religious minorities leaning strongly to the DMK-led front — a real finding, but a
            <em> survey</em> one, never something Form 20 can prove.
          </p>
          <p className="text-emerald-200/80 text-xs border-t border-emerald-900/50 pt-3">
            <b>Our rule:</b> booth data tells you how a <em>booth</em> voted — never how a religion, gender or age-group voted.
            We don&apos;t publish community/gender/age vote-shares as fact, and neither should anyone waving &ldquo;Form 20&rdquo;.
            (Gender/age estimates would only ever appear here clearly labelled as modelled estimates, with their uncertainty.)
          </p>
        </div>
      </div>

      {/* Observed gender layer — registration + turnout, NOT vote choice */}
      {s.eci_state.turnout_by_gender && (
        <Section title="Who&apos;s on the rolls & who turned out (observed)">
          <p className="text-xs text-gray-500 mb-3">
            These are <b className="text-gray-400">observed facts</b> — registration and turnout. They do <b className="text-gray-400">not</b> tell you how women or men voted (see above).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={Users} label="Women in the electorate"
              value={`${((s.electors.female / s.electors.total) * 100).toFixed(1)}%`}
              sub={`${(s.electors.female / 1e7).toFixed(2)} cr women`} accent="text-pink-300" />
            <Stat icon={Vote} label="Women turnout" value={`${s.eci_state.turnout_by_gender.female}%`} sub="of women electors voted" accent="text-pink-300" />
            <Stat icon={Vote} label="Men turnout" value={`${s.eci_state.turnout_by_gender.male}%`} sub="of men electors voted" accent="text-sky-300" />
            <Stat icon={Vote} label="Third-gender turnout" value={`${s.eci_state.turnout_by_gender.third}%`} sub="of third-gender electors" />
          </div>
          <p className="text-[11px] text-gray-600 mt-2">
            Women turned out at a higher rate than men ({s.eci_state.turnout_by_gender.female}% vs {s.eci_state.turnout_by_gender.male}%) — an observed turnout gap, not a statement about which party they chose.
          </p>
        </Section>
      )}

      {/* Hero stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        <Stat icon={ArrowRightLeft} label="Seats flipped 2021→2026" value={`${s.flips_2021_to_2026}`} sub={`of ${s.total_seats}`} accent="text-orange-400" />
        <Stat icon={Vote} label="Turnout" value={`${s.eci_state.turnout_pct}%`} sub="record high" accent="text-sky-300" />
        <Stat icon={Users} label="Electors" value={`${(s.electors.total / 1e7).toFixed(2)} cr`} sub={`${((s.electors.female / s.electors.total) * 100).toFixed(1)}% women`} />
        <Stat icon={TrendingDown} label="DMK vote swing" value="−13.5%" sub="AIADMK −12.1%" accent="text-red-400" />
      </div>

      {/* Seats 2026 */}
      <Section title="Seats won — 2026">
        <div className="space-y-1.5">
          {Object.entries(s.seats_2026).map(([party, n]) => (
            <div key={party} className="flex items-center gap-2">
              <span className="w-16 text-xs text-gray-300 text-right shrink-0">{party}</span>
              <div className="flex-1 bg-[#1a1a1a] rounded h-5 overflow-hidden">
                <div className="h-full rounded flex items-center justify-end pr-2 text-[10px] font-semibold text-black"
                     style={{ width: `${Math.max((n / maxSeat) * 100, 6)}%`, background: pcol(party) }}>
                  {n}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Votes vs seats — the disproportionality insight */}
      <Section title="Votes → seats: a plurality, not a majority">
        <p className="text-xs text-gray-500 mb-3">
          TVK won <b className="text-gray-300">34.9%</b> of votes but <b className="text-gray-300">46%</b> of seats —
          first-past-the-post amplified a plurality into the largest bloc. No party crossed 118 (majority); it&apos;s a hung house.
        </p>
        <div className="space-y-2">
          {s.eci_state.alliances.map(a => {
            const label = a.alliance.replace('SPA-', '').replace('NDA-', ''); // DMK+ / ADMK+ / TVK
            return (
              <div key={a.alliance} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-right text-gray-300 shrink-0">{label}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-[#1a1a1a] rounded h-4 overflow-hidden">
                    <div className="h-full" style={{ width: `${a.vote_share * 2}%`, background: pcol(label) }} />
                  </div>
                  <span className="text-gray-400 w-32 shrink-0">{a.vote_share}% votes · {a.seats} seats</span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 2021 -> 2026 swing — where parties lost their holds */}
      <SwingView />

      {/* District rollup — each card drills into booth/candidate detail */}
      <Section title={`Districts (${dists.length}) — click any district to drill in`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {dists.map(d => (
            <Link key={d.district} href={`/election-insights/${encodeURIComponent(d.district)}`}
              className="bg-[#111] border border-[#222] rounded-lg p-3 hover:border-orange-600/40 hover:bg-[#141414] transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-200 truncate flex items-center gap-1">
                  {d.district}
                  <ChevronRight size={12} className="text-gray-600 group-hover:text-orange-400 transition-colors" />
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-black shrink-0"
                      style={{ background: pcol(d.lead_party) }}>{d.lead_party}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {d.seats} seats · {d.female_share}% women voters
              </div>
              <div className="flex gap-0.5 mt-2 h-1.5 rounded overflow-hidden">
                {Object.entries(d.seats_2026).sort((a, b) => b[1] - a[1]).map(([p, n]) => (
                  <div key={p} style={{ width: `${(n / d.seats) * 100}%`, background: pcol(p) }} title={`${p}: ${n}`} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Constituency table */}
      <Section title={`All ${s.total_seats} constituencies`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-600" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search constituency or district…"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-orange-600/50 outline-none" />
          </div>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
          <Chip active={filter === 'flipped'} onClick={() => setFilter('flipped')}>Flipped ({cons.filter(c => c.flipped).length})</Chip>
        </div>
        <div className="overflow-x-auto border border-[#222] rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-[#161616] text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Constituency</th>
                <th className="text-left px-3 py-2 font-medium">District</th>
                <th className="text-left px-3 py-2 font-medium">2021 → 2026</th>
                <th className="text-right px-3 py-2 font-medium">Electors</th>
                <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">Women</th>
              </tr>
            </thead>
            <tbody>
              {shownCons.map(c => (
                <tr key={c.ac_no} className="border-t border-[#1c1c1c] hover:bg-[#141414]">
                  <td className="px-3 py-1.5 text-gray-200">{c.ac_name}</td>
                  <td className="px-3 py-1.5 text-gray-500">{c.district}</td>
                  <td className="px-3 py-1.5">
                    <span className="font-medium" style={{ color: pcol(c.winner_2021) }}>{c.winner_2021}</span>
                    <span className="text-gray-600 mx-1">→</span>
                    <span className="font-semibold" style={{ color: pcol(c.winner_2026) }}>{c.winner_2026}</span>
                    {c.flipped && <span className="ml-2 text-[9px] bg-orange-600/20 text-orange-300 px-1.5 py-0.5 rounded">FLIP</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{fmt(c.electors || 0)}</td>
                  <td className="px-3 py-1.5 text-right text-gray-500 hidden sm:table-cell">{c.female_share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-600 mt-2">Showing {shownCons.length} of {cons.length}.</p>
      </Section>

      {/* Credits — mandatory */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 mt-8 text-xs text-gray-400 leading-relaxed">
        <div className="text-gray-200 font-semibold mb-2">Credits & sources</div>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2">
            <Code2 size={13} className="text-gray-500 shrink-0" />
            Methodology / booth-level forensics primer:{' '}
            <a href="https://github.com/kaduvan/election-forensics" target="_blank" rel="noopener noreferrer"
               className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1">
              github.com/kaduvan/election-forensics <ExternalLink size={11} />
            </a>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gray-500 shrink-0">𝕏</span>
            Analysis & insights inspiration:{' '}
            <a href="https://x.com/_kaduvan" target="_blank" rel="noopener noreferrer"
               className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1">
              @_kaduvan <ExternalLink size={11} />
            </a>
          </li>
          <li className="text-gray-500">
            Results data: {s.eci_state.source}; via tnelections2026.in aggregator, headline figures
            spot-checked against ECI final.
          </li>
        </ul>
        <p className="text-[11px] text-gray-600 mt-3 border-t border-[#222] pt-3">{s.honest_note}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-sm font-semibold text-gray-200 mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Stat({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-lg px-4 py-3">
      <Icon size={15} className="text-gray-600 mb-1" />
      <div className={`text-xl font-bold ${accent || 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-gray-500 leading-tight">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
        active ? 'bg-orange-600/20 text-orange-300 border-orange-600/50'
               : 'text-gray-400 border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-gray-200'}`}>
      {children}
    </button>
  );
}
