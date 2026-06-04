'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, MinusCircle, Clock, Scale } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PromiseLite { status: string }

/**
 * GovScorecard — shows BOTH sides of the ledger: promises the TVK
 * government delivered (wins) alongside the ones broken/pending.
 *
 * Why it matters: a tracker that only ever shows negatives reads as
 * propaganda and a smart skeptic dismisses it on sight. Surfacing the
 * government's *wins* — using their own manifesto + delivery evidence —
 * turns the dashboard from a prosecutor into a scorekeeper, which is
 * far more credible. This uses REAL promise data (status='kept' = a
 * delivered win), no fabrication.
 */
export default function GovScorecard() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch(`${API}/api/promises/`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : []))
      .then((rows: PromiseLite[]) => {
        const c: Record<string, number> = { kept: 0, broken: 0, partial: 0, pending: 0 };
        for (const p of rows || []) if (p.status in c) c[p.status]++;
        setCounts(c);
      })
      .catch(() => setCounts(null));
  }, []);

  if (!counts) return null;
  const total = counts.kept + counts.broken + counts.partial + counts.pending;
  if (total === 0) return null;
  const keptPct = Math.round((counts.kept / total) * 100);

  const cells = [
    { label: 'Delivered',  value: counts.kept,    icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-800/40' },
    { label: 'Partial',    value: counts.partial, icon: MinusCircle,  color: 'text-yellow-400',  bg: 'bg-yellow-950/20 border-yellow-800/40' },
    { label: 'Broken',     value: counts.broken,  icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-950/20 border-red-800/40' },
    { label: 'Pending',    value: counts.pending, icon: Clock,        color: 'text-gray-400',    bg: 'bg-[#1a1a1a] border-[#2a2a2a]' },
  ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <Scale size={14} className="text-emerald-400" />
          Government Scorecard
          <span className="text-gray-600 text-xs font-normal">
            (we score delivery, not just failures)
          </span>
        </h2>
        <Link href="/promises" className="text-xs text-gray-500 hover:text-emerald-400">
          See all promises →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        {cells.map(c => (
          <Link
            key={c.label}
            href="/promises"
            className={`rounded-lg border p-4 ${c.bg} hover:brightness-125 transition-all`}
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-500 mb-1">
              <c.icon size={12} className={c.color} /> {c.label}
            </div>
            <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
          </Link>
        ))}
      </div>

      <p className="text-[11px] text-gray-500">
        {counts.kept} of {total} tracked manifesto promises delivered ({keptPct}%).
        We log what the government got right as well as what it didn&apos;t —
        scored against its own manifesto, with evidence on each.
      </p>
    </section>
  );
}
