'use client';
/**
 * Fact-check copilot — admin console (Phase 0).
 *
 * The contract that keeps this credible: the AI DRAFTS, the human DECIDES.
 * Paste a claim or URL → pipeline extracts the claim, matches our debunk
 * corpus + DMK archive, searches press coverage, and drafts a verdict with
 * confidence + citations. Nothing is a "verdict" until you hit Confirm
 * (optionally overriding the AI's call). Public surfacing of confirmed
 * checks is Phase 3 — this page is the supervised training ground.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ShieldQuestion, Link2, Type, Loader2, CheckCircle2, XCircle,
  ExternalLink, AlertTriangle, Scale, RefreshCw, Database, Landmark,
} from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Evidence { url: string; headline: string; outlet: string; tier: string; date: string; stance?: string }
interface Factcheck {
  id: string;
  input_type: 'text' | 'url';
  input_content: string;
  fetched_excerpt?: string | null;
  claim_text?: string | null;
  claims?: { text: string; checkable: boolean }[] | null;
  verdict?: string | null;
  confidence?: number | null;
  rationale?: string | null;
  what_would_change?: string | null;
  evidence?: Evidence[] | null;
  debunk_match?: any[] | null;
  dmk_match?: any[] | null;
  status: string;
  error_detail?: string | null;
  reviewer_note?: string | null;
  created_at: string;
}

const VERDICT_META: Record<string, { label: string; cls: string }> = {
  true:          { label: 'TRUE',          cls: 'bg-emerald-700 text-emerald-50' },
  partly_true:   { label: 'PARTLY TRUE',   cls: 'bg-lime-700 text-lime-50' },
  misleading:    { label: 'MISLEADING',    cls: 'bg-amber-600 text-amber-50' },
  false:         { label: 'FALSE',         cls: 'bg-red-700 text-red-50' },
  unverifiable:  { label: 'UNVERIFIABLE',  cls: 'bg-gray-600 text-gray-100' },
  needs_context: { label: 'NEEDS CONTEXT', cls: 'bg-sky-700 text-sky-50' },
};

const STANCE_CLS: Record<string, string> = {
  supports: 'text-emerald-400', contradicts: 'text-red-400',
  related: 'text-gray-400', irrelevant: 'text-gray-600',
};

function VerdictChip({ v }: { v?: string | null }) {
  if (!v) return null;
  const m = VERDICT_META[v] || { label: v.toUpperCase(), cls: 'bg-gray-700 text-gray-100' };
  return <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded', m.cls)}>{m.label}</span>;
}

export default function FactcheckAdminPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [message, setMessage] = useState('');
  const [inputType, setInputType] = useState<'text' | 'url'>('text');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<Factcheck[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load(s: string) {
    try {
      const res = await fetch(`${API}/api/factcheck/?limit=30`, { headers: { 'x-admin-secret': s } });
      if (res.status === 403) { setMessage('Wrong secret'); return; }
      setItems(await res.json());
      setAuthed(true);
      setMessage('');
    } catch { setMessage('Cannot connect to backend'); }
  }

  // Poll while any job is queued/running
  useEffect(() => {
    if (!authed) return;
    const busy = items.some(i => i.status === 'queued' || i.status === 'running');
    if (busy && !pollRef.current) {
      pollRef.current = setInterval(() => load(secret), 4000);
    } else if (!busy && pollRef.current) {
      clearInterval(pollRef.current); pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, authed]);

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/factcheck/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ input_type: inputType, content: content.trim() }),
      });
      if (res.ok) {
        const j = await res.json();
        setActiveId(j.id);
        setContent('');
        await load(secret);
      } else {
        setMessage(`Submit failed (${res.status})`);
      }
    } catch { setMessage('Submit failed — backend unreachable'); }
    finally { setSubmitting(false); }
  }

  async function review(id: string, decision: 'confirmed' | 'rejected', verdictOverride?: string) {
    const note = window.prompt(decision === 'confirmed'
      ? 'Optional reviewer note (what you verified):'
      : 'Why is this rejected? (kept for the audit trail)') ?? undefined;
    await fetch(`${API}/api/factcheck/${id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ decision, note, verdict_override: verdictOverride || undefined }),
    });
    await load(secret);
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <ShieldQuestion size={18} className="text-violet-400" /> Fact-check Copilot
        </h1>
        <input
          type="password" value={secret} onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(secret)}
          placeholder="Admin secret"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-violet-500"
        />
        <button onClick={() => load(secret)}
          className="mt-3 w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold py-2 rounded-lg">
          Enter
        </button>
        {message && <p className="text-red-400 text-xs mt-2">{message}</p>}
      </div>
    );
  }

  const active = items.find(i => i.id === activeId) || null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldQuestion size={20} className="text-violet-400" /> Fact-check Copilot
        </h1>
        <button onClick={() => load(secret)} className="text-gray-500 hover:text-white" aria-label="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        AI drafts the verdict with evidence — <span className="text-gray-300">you decide</span>.
        Nothing counts as a verdict until you confirm it.
      </p>

      {/* Input */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 mb-6">
        <div className="flex gap-2 mb-3">
          {(['text', 'url'] as const).map(t => (
            <button key={t} onClick={() => setInputType(t)}
              className={clsx('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border',
                inputType === t ? 'bg-violet-600 border-violet-600 text-white font-semibold'
                  : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:text-white')}>
              {t === 'text' ? <Type size={11} /> : <Link2 size={11} />} {t === 'text' ? 'Claim text' : 'URL'}
            </button>
          ))}
        </div>
        <textarea
          value={content} onChange={e => setContent(e.target.value)}
          rows={inputType === 'text' ? 3 : 1}
          placeholder={inputType === 'text'
            ? 'Paste the claim to check, e.g. "TN is the first state in the country to use drone patrolling for women’s safety"'
            : 'https://x.com/... or any article URL'}
          className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-violet-500 resize-y"
        />
        <div className="flex justify-end mt-2">
          <button onClick={submit} disabled={submitting || !content.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-lg flex items-center gap-2">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Scale size={14} />} Run fact-check
          </button>
        </div>
      </div>

      {message && <p className="text-red-400 text-xs mb-4">{message}</p>}

      <div className="grid md:grid-cols-5 gap-5">
        {/* History list */}
        <div className="md:col-span-2 space-y-2">
          {items.length === 0 && <p className="text-gray-600 text-sm">No checks yet.</p>}
          {items.map(i => (
            <button key={i.id} onClick={() => setActiveId(i.id)}
              className={clsx('w-full text-left rounded-lg border p-3 transition-colors',
                activeId === i.id ? 'border-violet-600 bg-violet-950/20'
                  : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]')}>
              <div className="flex items-center gap-2 mb-1">
                {(i.status === 'queued' || i.status === 'running') &&
                  <Loader2 size={12} className="text-violet-400 animate-spin shrink-0" />}
                {i.status === 'error' && <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                {i.status === 'confirmed' && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                {i.status === 'rejected' && <XCircle size={12} className="text-gray-500 shrink-0" />}
                <VerdictChip v={i.verdict} />
                <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                  {new Date(i.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-[12px] text-gray-300 line-clamp-2">
                {i.claim_text || i.input_content}
              </div>
              <div className="text-[10px] text-gray-600 mt-1 uppercase">{i.status}</div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="md:col-span-3">
          {!active ? (
            <p className="text-gray-600 text-sm">Select a check to see the draft verdict.</p>
          ) : (
            <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <VerdictChip v={active.verdict} />
                {active.confidence != null && (
                  <span className="text-xs text-gray-400">
                    confidence <strong className="text-gray-200">{Math.round((active.confidence || 0) * 100)}%</strong>
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-wider text-gray-600 ml-auto">{active.status}</span>
              </div>

              {(active.status === 'queued' || active.status === 'running') && (
                <p className="text-sm text-violet-300 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Pipeline running — extracting claim, matching corpus, searching press…
                </p>
              )}

              {active.status === 'error' && (
                <p className="text-sm text-red-400">{active.error_detail || 'Pipeline failed.'}</p>
              )}

              {active.claim_text && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Claim checked</div>
                  <p className="text-sm text-white font-medium">&ldquo;{active.claim_text}&rdquo;</p>
                </div>
              )}

              {active.rationale && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Rationale (AI draft)</div>
                  <p className="text-[13px] text-gray-300 leading-relaxed">{active.rationale}</p>
                </div>
              )}

              {active.what_would_change && (
                <div className="mb-3 rounded-md bg-[#111] border border-[#262626] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">What would change this verdict</div>
                  <p className="text-[12px] text-gray-400">{active.what_would_change}</p>
                </div>
              )}

              {(active.debunk_match?.length ?? 0) > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-rose-400/80 mb-1 flex items-center gap-1">
                    <Database size={10} /> Known-debunk corpus matches
                  </div>
                  {active.debunk_match!.map((d: any, i: number) => (
                    <div key={i} className="text-[12px] text-gray-300 mb-1">
                      • {d.title} <span className="text-gray-600">({d.kind}{d.status ? `, ${d.status}` : ''})</span>
                      {d.debunk_url && (
                        <a href={d.debunk_url} target="_blank" rel="noopener noreferrer" className="text-rose-400 ml-1">
                          debunk <ExternalLink size={9} className="inline" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(active.dmk_match?.length ?? 0) > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-yellow-400/80 mb-1 flex items-center gap-1">
                    <Landmark size={10} /> DMK-archive matches (possible credit-steal)
                  </div>
                  {active.dmk_match!.map((d: any, i: number) => (
                    <div key={i} className="text-[12px] text-gray-300">
                      • {d.scheme} <span className="text-gray-600">launched {d.launch_date}</span>
                    </div>
                  ))}
                </div>
              )}

              {(active.evidence?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Press evidence</div>
                  {active.evidence!.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px] mb-1.5">
                      <span className={clsx('shrink-0 font-semibold w-20', STANCE_CLS[e.stance || 'related'])}>
                        {e.stance || 'related'}
                      </span>
                      <a href={e.url} target="_blank" rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white flex-1">
                        {e.headline} <span className="text-gray-600">— {e.outlet} ({e.tier})</span>
                        <ExternalLink size={9} className="inline ml-1 text-gray-600" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {active.reviewer_note && (
                <p className="text-[12px] text-gray-500 mb-3">Reviewer note: {active.reviewer_note}</p>
              )}

              {active.status === 'draft' && (
                <div className="flex gap-2 flex-wrap pt-2 border-t border-[#262626]">
                  <button onClick={() => review(active.id, 'confirmed')}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Confirm verdict
                  </button>
                  <select
                    defaultValue=""
                    onChange={e => { if (e.target.value) review(active.id, 'confirmed', e.target.value); }}
                    className="bg-[#111] border border-[#2a2a2a] text-gray-300 text-xs rounded-lg px-2"
                    aria-label="Confirm with a different verdict"
                  >
                    <option value="" disabled>Confirm with override…</option>
                    {Object.keys(VERDICT_META).map(v => (
                      <option key={v} value={v}>{VERDICT_META[v].label}</option>
                    ))}
                  </select>
                  <button onClick={() => review(active.id, 'rejected')}
                    className="bg-[#2a2a2a] hover:bg-[#333] text-gray-300 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5">
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-gray-600 mt-6">
        Phase 0 — internal copilot. Confirmed checks become the corpus for the public tool (Phase 3),
        which will only ever surface human-confirmed verdicts.
      </p>
    </div>
  );
}
