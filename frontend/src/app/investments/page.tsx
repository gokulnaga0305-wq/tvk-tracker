'use client';
import { useEffect, useState } from 'react';
import { Factory, TrendingDown, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import InvestmentRecord from '@/components/InvestmentRecord';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Commitment {
  id: string;
  company: string;
  sector: string | null;
  amount_cr: number | null;
  jobs_promised: number | null;
  location: string | null;
  mou_date: string | null;
  source_event: string | null;
  source_url: string | null;
  status: string;
  status_note: string | null;
}
interface Scorecard {
  total_commitments: number;
  total_committed_cr: number;
  total_jobs_promised: number;
  on_track_count: number;
  at_risk_count: number;
  lost_count: number;
  lost_cr: number;
  lost_jobs: number;
  at_risk_cr: number;
  operational_count: number;
  operational_cr: number;
  in_progress_count: number;
  in_progress_cr: number;
  committed_count: number;
  committed_cr: number;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  committed:   { label: 'Committed',   cls: 'text-blue-300 border-blue-700 bg-blue-950/30' },
  in_progress: { label: 'In progress', cls: 'text-cyan-300 border-cyan-700 bg-cyan-950/30' },
  operational: { label: 'Operational', cls: 'text-emerald-300 border-emerald-700 bg-emerald-950/30' },
  stalled:     { label: 'Stalled',     cls: 'text-amber-300 border-amber-700 bg-amber-950/30' },
  shifted:     { label: 'Shifted away', cls: 'text-red-300 border-red-700 bg-red-950/40' },
  cancelled:   { label: 'Cancelled',   cls: 'text-red-300 border-red-700 bg-red-950/40' },
};

function crore(n: number | null): string {
  if (!n) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} lakh cr`;
  return `₹${n.toLocaleString('en-IN')} cr`;
}

export default function InvestmentsPage() {
  const [sc, setSc] = useState<Scorecard | null>(null);
  const [rows, setRows] = useState<Commitment[]>([]);

  useEffect(() => {
    fetch(`${API}/api/investments/scorecard`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null)).then(setSc).catch(() => {});
    fetch(`${API}/api/investments/`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : [])).then(setRows).catch(() => {});
  }, []);

  const cells = sc ? [
    { label: 'Tracked MoUs', value: sc.total_commitments, sub: 'flagship DMK-era', icon: Factory, color: 'text-white' },
    { label: 'Pipeline value', value: crore(sc.total_committed_cr), sub: `${(sc.total_jobs_promised || 0).toLocaleString('en-IN')} jobs promised`, icon: ShieldCheck, color: 'text-blue-300' },
    { label: 'On track', value: sc.on_track_count, sub: 'committed / building / live', icon: ShieldCheck, color: 'text-emerald-400' },
    { label: 'At risk', value: sc.at_risk_count, sub: crore(sc.at_risk_cr) + ' watched', icon: AlertTriangle, color: 'text-amber-400' },
    { label: 'Confirmed lost', value: sc.lost_count, sub: sc.lost_count ? `${crore(sc.lost_cr)} · ${(sc.lost_jobs || 0).toLocaleString('en-IN')} jobs` : 'none yet', icon: TrendingDown, color: sc.lost_count ? 'text-red-400' : 'text-gray-500' },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Factory size={20} className="text-orange-400" />
        <h1 className="text-xl font-bold text-white">Investment — myths &amp; facts</h1>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        Everything on Tamil Nadu&rsquo;s investment record in one place: the live scorecard of flagship MoUs and their real
        status, the honest conversion record vs other states, and the myths — manufactured &ldquo;TVK wins&rdquo; and the
        &ldquo;companies fled TN&rdquo; claim — fact-checked. Government figures are flagged self-reported; where another side
        has a point, we say so.
      </p>

      <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <ShieldCheck size={15} className="text-emerald-400" /> DMK Investment Scorecard — tracked flagships &amp; their status
      </h2>

      {sc && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {cells.map(c => (
            <div key={c.label} className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                <c.icon size={12} className={c.color} /> {c.label}
              </div>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Built vs promised — the honest "MoU ≠ money delivered" split */}
      {sc && sc.total_committed_cr > 0 && typeof sc.committed_cr === 'number' && (() => {
        const segs = [
          { label: 'Operational (live)', cr: sc.operational_cr, c: '#1d9e75' },
          { label: 'Under construction', cr: sc.in_progress_cr, c: '#3aa6c0' },
          { label: 'MoU only (signed, not built)', cr: sc.committed_cr, c: '#5a7fd0' },
          { label: 'At risk', cr: sc.at_risk_cr, c: '#d99a3a' },
        ];
        const opPct = Math.round((sc.operational_cr / sc.total_committed_cr) * 100);
        return (
          <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 mb-6">
            <div className="text-[12px] text-gray-400 mb-2">
              Built vs promised — of the <span className="text-gray-200 font-semibold">{crore(sc.total_committed_cr)}</span> pipeline,
              how much is actually on the ground?
            </div>
            <div className="flex h-4 rounded overflow-hidden bg-[#111] mb-2">
              {segs.map((s, i) => s.cr > 0 ? (
                <div key={i} className="h-full" style={{ width: `${(s.cr / sc.total_committed_cr) * 100}%`, background: s.c }} />
              ) : null)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
              {segs.map((s, i) => s.cr > 0 ? (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.c }} />
                  {s.label}: <span className="text-gray-300">{crore(s.cr)}</span>
                </span>
              ) : null)}
            </div>
            <p className="text-[11.5px] text-gray-500 mt-2.5 leading-relaxed">
              Only <span className="text-emerald-300 font-medium">{crore(sc.operational_cr)} (~{opPct}%)</span> is
              operational on the ground today. Most of the headline is <span className="text-gray-300">signed MoUs not yet built</span> —
              an MoU is a commitment, not delivered money.
            </p>
          </div>
        );
      })()}

      <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#161616] text-gray-500 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5">Company</th>
              <th className="text-left px-4 py-2.5 hidden sm:table-cell">Sector</th>
              <th className="text-right px-4 py-2.5">Amount</th>
              <th className="text-right px-4 py-2.5 hidden md:table-cell">Jobs</th>
              <th className="text-left px-4 py-2.5 hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const st = STATUS[r.status] || STATUS.committed;
              return (
                <tr key={r.id} className="border-t border-[#222] hover:bg-[#181818]">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{r.company}</div>
                    {r.status_note && <div className="text-[11px] text-gray-500 mt-0.5">{r.status_note}</div>}
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.source_event && <span className="text-[10px] text-gray-600">{r.source_event}</span>}
                      {r.source_url && (
                        <a href={r.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-0.5">
                          source <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{r.sector}</td>
                  <td className="px-4 py-3 text-right text-gray-200 font-semibold whitespace-nowrap">{crore(r.amount_cr)}</td>
                  <td className="px-4 py-3 text-right text-gray-400 hidden md:table-cell">{r.jobs_promised ? r.jobs_promised.toLocaleString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{r.location}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600">
                Registry not loaded yet. Run migration 019 + the watcher.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-600 mt-3">
        Scope: flagship commitments by value — a subset of GIM 2024&apos;s full
        <span className="text-gray-500"> ₹6.64 lakh cr / 631 MoUs</span>, plus a few major later project MoUs. Every
        row links its source. An MoU is a signed commitment, <span className="text-gray-500">not money delivered</span> —
        see the built-vs-MoU split above. The weekly watcher flags any tracked company that appears in a
        shift/stall/cancel story for review before its status changes.
      </p>

      {/* The myths & facts narrative — Conversion Conclave record, cross-state
          conversion, structural strengths, marquee MoUs, the "25 companies fled"
          myth-check, and the manufactured "TVK win" fakes. Moved here from the
          Dravidian Model tab so all investment content lives in one place. */}
      <InvestmentRecord />
    </div>
  );
}
