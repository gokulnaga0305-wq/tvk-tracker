'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRightLeft, ExternalLink, ShieldCheck, AlertTriangle, Calendar,
  MapPin, FileWarning,
} from 'lucide-react';

/**
 * /horse-trading — public tracker of opposition MLAs/leaders switching
 * sides to TVK.  Design constraint: NO jargon, plain English, easy to scan.
 *
 * One card per defection with the four bits of info that matter:
 *   1. WHO crossed (name + constituency)
 *   2. WHERE (party arrow: AIADMK → TVK)
 *   3. WHAT THEY SAID vs WHAT'S ALLEGED  (side-by-side)
 *   4. EVIDENCE links
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Defection {
  id: string;
  mla_name: string;
  constituency: string | null;
  from_party: string;
  to_party: string;
  resignation_date: string | null;
  joined_date: string | null;
  stated_reason: string | null;
  alleged_reason: string | null;
  pending_cases: Array<{ court?: string; case_no?: string; status?: string }>;
  evidence_urls: string[];
  severity: number;
  ai_confidence: number;
  status: 'pending' | 'verified' | 'disputed' | 'retracted';
  notes: string | null;
  created_at: string;
}

interface DefectionStats {
  total: number;
  verified: number;
  pending: number;
  to_tvk: number;
  from_aiadmk: number;
  last_30_days: number;
  as_of: string;
}

const PARTY_COLOR: Record<string, string> = {
  AIADMK: 'text-emerald-300',   // AIADMK's two leaves are green-ish historically
  DMK:    'text-rose-300',      // red+black
  Congress:'text-sky-300',
  BJP:    'text-orange-300',
  TVK:    'text-yellow-300',
};

function partyClass(p: string): string {
  return PARTY_COLOR[p] || 'text-gray-300';
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function DefectionCard({ d }: { d: Defection }) {
  const isPending = d.status === 'pending';
  return (
    <article className="bg-[#15161c] border border-[#262833] rounded-lg p-5">
      {/* Header: name + party arrow + status */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-base leading-tight">
            {d.mla_name}
          </h3>
          {d.constituency && (
            <div className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
              <MapPin size={11} />
              {d.constituency}
            </div>
          )}
        </div>
        {isPending ? (
          <span className="text-[10px] uppercase tracking-wider bg-amber-950/60 text-amber-400 border border-amber-800/40 rounded px-2 py-0.5">
            unconfirmed
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 rounded px-2 py-0.5 inline-flex items-center gap-1">
            <ShieldCheck size={10} /> verified
          </span>
        )}
      </div>

      {/* Party arrow row */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <span className={`font-mono font-semibold ${partyClass(d.from_party)}`}>{d.from_party}</span>
        <ArrowRightLeft size={14} className="text-gray-500" />
        <span className={`font-mono font-semibold ${partyClass(d.to_party)}`}>{d.to_party}</span>
        <div className="ml-auto text-xs text-gray-500 flex items-center gap-1">
          <Calendar size={11} />
          {fmtDate(d.joined_date ?? d.resignation_date)}
        </div>
      </div>

      {/* Stated vs alleged reasons, side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="bg-black/30 border border-[#262833] rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            What they said publicly
          </div>
          <p className="text-gray-300 text-sm leading-snug">
            {d.stated_reason || <span className="text-gray-600 italic">No public statement on record</span>}
          </p>
        </div>
        <div className="bg-red-950/20 border border-red-900/30 rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1 flex items-center gap-1">
            <AlertTriangle size={10} /> What's actually alleged
          </div>
          <p className="text-red-200 text-sm leading-snug">
            {d.alleged_reason || <span className="text-red-400/60 italic">No allegation reported</span>}
          </p>
        </div>
      </div>

      {/* Pending cases (collapsed if empty) */}
      {Array.isArray(d.pending_cases) && d.pending_cases.length > 0 && (
        <div className="bg-orange-950/20 border border-orange-900/30 rounded p-3 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-2 flex items-center gap-1">
            <FileWarning size={10} /> Pending legal cases at time of switch
          </div>
          <ul className="space-y-1">
            {d.pending_cases.map((c, i) => (
              <li key={i} className="text-orange-200 text-xs">
                <span className="font-mono">{c.court || '—'}</span>
                {c.case_no && <> · {c.case_no}</>}
                {c.status && <> · <em className="text-orange-300/70">{c.status}</em></>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence */}
      {d.evidence_urls.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-gray-500 mr-1">Press coverage:</span>
          {d.evidence_urls.slice(0, 5).map((url, i) => {
            let host = '';
            try { host = new URL(url).hostname.replace('www.', ''); } catch { host = 'source'; }
            return (
              <a
                key={url}
                href={url}
                target="_blank" rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 hover:underline inline-flex items-center gap-0.5"
              >
                {host} <ExternalLink size={9} />
              </a>
            );
          })}
        </div>
      )}

      {d.notes && (
        <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-gray-500 italic">
          {d.notes}
        </div>
      )}
    </article>
  );
}

export default function HorseTradingPage() {
  const [defections, setDefections] = useState<Defection[]>([]);
  const [stats, setStats] = useState<DefectionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API}/api/defections/`, { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/defections/stats`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
    ])
      .then(([list, s]) => {
        if (cancelled) return;
        setDefections(Array.isArray(list) ? list : []);
        setStats(s);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ArrowRightLeft size={22} className="text-orange-400" />
          Horse Trading
        </h1>
        <p className="text-gray-500 text-sm mt-1 max-w-2xl leading-relaxed">
          Opposition MLAs and leaders crossing over to TVK since the government took
          office. We track who jumped, when, what they said publicly, and what's
          actually alleged behind the move — pending court cases, cabinet promises,
          money trail.
        </p>
      </div>

      {/* Plain-English summary numbers */}
      {stats && stats.total > 0 && (
        <div className="bg-[#15161c] border border-[#262833] rounded-lg p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-3xl font-bold text-white tabular-nums">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">MLAs poached overall</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-400 tabular-nums">{stats.verified}</div>
            <div className="text-xs text-gray-500 mt-1">confirmed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400 tabular-nums">{stats.pending}</div>
            <div className="text-xs text-gray-500 mt-1">awaiting confirmation</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-400 tabular-nums">{stats.last_30_days}</div>
            <div className="text-xs text-gray-500 mt-1">in the last 30 days</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && defections.length === 0 && (
        <div className="bg-[#15161c] border border-[#262833] rounded-lg p-8 text-center">
          <ArrowRightLeft size={28} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">
            No defections tracked yet.
          </p>
          <p className="text-gray-600 text-xs mt-2 max-w-md mx-auto">
            As soon as press coverage describes an AIADMK / Congress / DMK MLA
            switching to TVK, the AI pipeline will pick it up automatically and
            it'll appear here.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#15161c] border border-[#262833] rounded-lg p-5 h-48 animate-pulse" />
          ))}
        </div>
      )}

      {/* Defection cards */}
      {!loading && defections.length > 0 && (
        <div className="space-y-4">
          {defections.map(d => <DefectionCard key={d.id} d={d} />)}
        </div>
      )}

      {/* Footer note */}
      {defections.length > 0 && (
        <p className="text-[11px] text-gray-600 mt-6 italic">
          "Unconfirmed" items are based on a single press source. They auto-upgrade
          to "verified" once two or more independent outlets corroborate.
        </p>
      )}
    </main>
  );
}
