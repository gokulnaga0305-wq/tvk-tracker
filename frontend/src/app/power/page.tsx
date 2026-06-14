'use client';
import { useEffect, useState } from 'react';
import { Zap, TrendingUp, Award, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import TangedcoTurnaround from '@/components/TangedcoTurnaround';
import UdayPrePostCard from '@/components/UdayPrePostCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PeakRow { year: string; peak_mw: number; note: string }
interface MixRow { source: string; pct: number; mu: number; color: string }
interface CtxRow { kind: string; text: string }
interface Overview {
  peak_demand_history: PeakRow[];
  all_time_high_mw: number;
  all_time_high_date: string;
  procurement_mix: MixRow[];
  rating: { label: string; from: string; to: string; detail: string };
  context: CtxRow[];
  sources: string[];
}

const BAR: Record<string, string> = {
  amber: 'bg-amber-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500',
  green: 'bg-green-500', gray: 'bg-gray-500',
};

export default function PowerPage() {
  const [d, setD] = useState<Overview | null>(null);
  useEffect(() => {
    fetch(`${API}/api/power/overview`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null)).then(setD).catch(() => {});
  }, []);
  if (!d) return <div className="max-w-5xl mx-auto px-4 py-6 text-gray-500">Loading…</div>;

  const maxMw = Math.max(...d.peak_demand_history.map(p => p.peak_mw));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={20} className="text-amber-400" />
        <h1 className="text-xl font-bold text-white">Tamil Nadu Power — the record & the reality</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Verified peak-demand history, how the all-time-high day was supplied, and the honest
        structural picture — wins and risks both, so the numbers hold up to scrutiny.
      </p>

      {/* Peak demand history */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 mb-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
          <TrendingUp size={15} className="text-amber-400" /> Peak demand met (MW)
        </div>
        <div className="space-y-2">
          {d.peak_demand_history.map(p => {
            const pct = Math.round((p.peak_mw / maxMw) * 100);
            const top = p.peak_mw === d.all_time_high_mw;
            return (
              <div key={p.year} className="flex items-center gap-3">
                <span className="w-16 text-[11px] text-gray-500 shrink-0">{p.year}</span>
                <div className="flex-1 bg-[#111] rounded h-6 overflow-hidden relative">
                  <div className={`h-full ${top ? 'bg-amber-500' : 'bg-amber-700/60'} rounded`} style={{ width: `${pct}%` }} />
                  <span className="absolute left-2 top-0 h-6 flex items-center text-[11px] font-semibold text-white">
                    {p.peak_mw.toLocaleString('en-IN')} MW
                  </span>
                </div>
                {p.note && <span className="text-[10px] text-gray-600 w-40 shrink-0 hidden md:block">{p.note}</span>}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-500 mt-3">
          Demand grew ~47% in a decade — and was met every year, peaking at an all-time high of
          <span className="text-amber-400 font-semibold"> {d.all_time_high_mw.toLocaleString('en-IN')} MW</span> on {d.all_time_high_date}.
        </p>
      </section>

      {/* Procurement mix + rating */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
          <div className="text-sm font-semibold text-white mb-1">How the record day was supplied</div>
          <div className="text-[11px] text-gray-500 mb-4">Apr 29, 2026 · 471 MU consumed</div>
          {d.procurement_mix.map(m => (
            <div key={m.source} className="mb-2.5">
              <div className="flex justify-between text-[11px] text-gray-400 mb-0.5">
                <span>{m.source}</span><span className="text-gray-300 font-semibold">{m.pct}%</span>
              </div>
              <div className="bg-[#111] rounded h-2 overflow-hidden">
                <div className={`h-full ${BAR[m.color] || 'bg-gray-500'} rounded`} style={{ width: `${m.pct}%` }} />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-gray-500 mt-2">
            Met via diversified procurement — <span className="text-amber-400">36% from private players</span>,
            only ~17% from the state's own generation.
          </p>
        </section>

        <section className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-5 flex flex-col">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300 mb-2">
            <Award size={15} /> {d.rating.label}
          </div>
          <div className="flex items-center gap-3 my-2">
            <span className="text-2xl font-bold text-gray-500">{d.rating.from}</span>
            <span className="text-emerald-400">→</span>
            <span className="text-4xl font-bold text-emerald-400">{d.rating.to}</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">{d.rating.detail}</p>
        </section>
      </div>

      {/* TANGEDCO financial turnaround — plain-English, audited */}
      <TangedcoTurnaround />

      {/* UDAY pre/post — CAG-documented, honest tariff framing */}
      <UdayPrePostCard />

      {/* Honest context */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="text-sm font-semibold text-white mb-3">The honest picture (so it can't be ambushed)</div>
        <div className="space-y-2.5">
          {d.context.map((c, i) => {
            const Icon = c.kind === 'win' ? CheckCircle2 : c.kind === 'risk' ? AlertTriangle : Info;
            const col = c.kind === 'win' ? 'text-emerald-400' : c.kind === 'risk' ? 'text-amber-400' : 'text-gray-400';
            return (
              <div key={i} className="flex gap-2.5 text-[13px] text-gray-300 leading-relaxed">
                <Icon size={15} className={`${col} shrink-0 mt-0.5`} /> <span>{c.text}</span>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-[11px] text-gray-600 mt-3">Sources: {d.sources.join(' · ')}.</p>
    </div>
  );
}
