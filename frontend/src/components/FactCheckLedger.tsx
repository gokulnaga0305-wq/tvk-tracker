'use client';
import { useState, useEffect } from 'react';
import { ShieldCheck, ExternalLink, Filter, FileText, Newspaper, UserCheck } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface FactCheck {
  id: string;
  claim: string;
  claim_summary: string | null;
  verdict: string;
  evidence_tier: number;
  confidence: number | null;
  favoring: string | null;
  concedes: string | null;
  what_would_change: string | null;
  debunk_source: string | null;
  debunk_url: string | null;
  sources: string[] | null;
  tags: string[] | null;
  first_seen: string | null;
}

interface Summary {
  total: number;
  by_verdict: Record<string, number>;
  by_evidence_tier: Record<string, number>;
  primary_sourced: number;
  honest_disclaimer: string;
}

// Verdict ladder (Protocol A) -> label + colour.
const VERDICT: Record<string, { label: string; cls: string }> = {
  credit_steal:       { label: 'Credit Steal',   cls: 'bg-orange-600/15 text-orange-400 border-orange-600/40' },
  false:              { label: 'False',           cls: 'bg-red-600/15 text-red-400 border-red-600/40' },
  fabricated:         { label: 'Fabricated',      cls: 'bg-red-700/20 text-red-300 border-red-700/50' },
  misleading:         { label: 'Misleading',      cls: 'bg-amber-600/15 text-amber-400 border-amber-600/40' },
  manufactured_first: { label: "Fake 'First'",    cls: 'bg-purple-600/15 text-purple-300 border-purple-600/40' },
  unproven:           { label: 'Unproven',        cls: 'bg-gray-600/15 text-gray-300 border-gray-600/40' },
  mostly_true:        { label: 'Mostly True',     cls: 'bg-sky-600/15 text-sky-300 border-sky-600/40' },
  true:               { label: 'True',            cls: 'bg-green-600/15 text-green-400 border-green-600/40' },
};

// Evidence tier (Protocol B) -> badge.
const TIER: Record<number, { label: string; cls: string; icon: any }> = {
  1: { label: 'Tier 1 · Primary document', cls: 'text-green-400 border-green-600/40', icon: FileText },
  2: { label: 'Tier 2 · Named official',   cls: 'text-green-400 border-green-600/40', icon: UserCheck },
  3: { label: 'Tier 3 · Multiple outlets', cls: 'text-sky-300 border-sky-600/40',    icon: Newspaper },
  4: { label: 'Tier 4 · Single outlet',    cls: 'text-amber-400 border-amber-600/40', icon: Newspaper },
  5: { label: 'Tier 5 · Social only (held)', cls: 'text-gray-400 border-gray-600/40', icon: Newspaper },
};

export default function FactCheckLedger() {
  const [rows, setRows] = useState<FactCheck[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/fact-checks/?max_tier=4&limit=500`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/fact-checks/summary`).then(r => r.json()).catch(() => null),
    ]).then(([r, s]) => {
      setRows(Array.isArray(r) ? r : []);
      setSummary(s);
    }).finally(() => setLoading(false));
  }, []);

  const verdicts = summary ? Object.entries(summary.by_verdict).sort((a, b) => b[1] - a[1]) : [];
  const shown = filter === 'all' ? rows : rows.filter(r => r.verdict === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <ShieldCheck className="text-orange-500 mt-1 shrink-0" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Fact-Check Ledger</h1>
          <p className="text-gray-400 text-sm mt-1">
            Every verdict on this dashboard, in one place — each with an evidence tier,
            the points we concede, and what would change our mind.
          </p>
        </div>
      </div>

      {/* Credibility strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
          <Stat label="Verdicts published" value={summary.total} />
          <Stat label="Primary-sourced (Tier 1–2)" value={summary.primary_sourced} accent="text-green-400" />
          <Stat label="Credit-steals" value={summary.by_verdict.credit_steal || 0} accent="text-orange-400" />
          <Stat label="Fabricated / false" value={(summary.by_verdict.false || 0) + (summary.by_verdict.fabricated || 0)} accent="text-red-400" />
        </div>
      )}

      {/* Protocol note */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 text-xs text-gray-400 mb-6 leading-relaxed">
        <span className="text-gray-200 font-semibold">How we grade.</span>{' '}
        A claim is published only when the evidence supports it. <span className="text-green-400">Tier 1–2</span> = a
        government document or a named official. <span className="text-sky-300">Tier 3</span> = two or more outlets.{' '}
        <span className="text-amber-400">Tier 4</span> = a single outlet (shown, but flagged). Social-media-only
        claims (Tier 5) are <span className="text-gray-200">held back</span> until corroborated — we don&apos;t publish a
        verdict we can&apos;t stand behind.
      </div>

      {/* Verdict filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Filter size={14} className="text-gray-500" />
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All ({rows.length})</Chip>
        {verdicts.map(([v, n]) => (
          <Chip key={v} active={filter === v} onClick={() => setFilter(v)}>
            {(VERDICT[v]?.label || v)} ({n})
          </Chip>
        ))}
      </div>

      {/* Rows */}
      {loading ? (
        <div className="text-gray-500 py-12 text-center">Loading the ledger…</div>
      ) : shown.length === 0 ? (
        <div className="text-gray-500 py-12 text-center">No verdicts in this view yet.</div>
      ) : (
        <div className="space-y-3">
          {shown.map(fc => <Card key={fc.id} fc={fc} />)}
        </div>
      )}

      {summary && (
        <p className="text-[11px] text-gray-600 mt-8 leading-relaxed border-t border-[#222] pt-4">
          {summary.honest_disclaimer}
        </p>
      )}
    </div>
  );
}

function Card({ fc }: { fc: FactCheck }) {
  const v = VERDICT[fc.verdict] || { label: fc.verdict, cls: 'bg-gray-600/15 text-gray-300 border-gray-600/40' };
  const tier = TIER[fc.evidence_tier] || TIER[4];
  const TierIcon = tier.icon;
  const link = fc.debunk_url || (fc.sources && fc.sources[0]) || null;
  return (
    <div className="bg-[#111] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${v.cls}`}>{v.label}</span>
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${tier.cls}`}>
            <TierIcon size={11} /> {tier.label}
          </span>
          {typeof fc.confidence === 'number' && (
            <span className="text-[10px] text-gray-500">confidence {Math.round(fc.confidence * 100)}%</span>
          )}
          {fc.favoring && (
            <span className="text-[10px] text-gray-500">favours {fc.favoring}</span>
          )}
        </div>
        {fc.first_seen && <span className="text-[10px] text-gray-600 shrink-0">{fc.first_seen}</span>}
      </div>

      <p className="text-sm text-gray-100 mt-2.5 leading-snug">{fc.claim_summary || fc.claim}</p>

      {fc.concedes && (
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          <span className="text-gray-300 font-medium">What&apos;s genuine / conceded: </span>{fc.concedes}
        </p>
      )}
      {fc.what_would_change && (
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          <span className="text-gray-300 font-medium">What would change this: </span>{fc.what_would_change}
        </p>
      )}

      <div className="flex items-center gap-3 mt-3 text-[11px]">
        {fc.debunk_source && <span className="text-gray-500">Source: {fc.debunk_source}</span>}
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300">
            Evidence <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-lg px-4 py-3">
      <div className={`text-2xl font-bold ${accent || 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{label}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
        active ? 'bg-orange-600/20 text-orange-300 border-orange-600/50'
               : 'text-gray-400 border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
