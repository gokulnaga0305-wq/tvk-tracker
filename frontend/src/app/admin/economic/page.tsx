'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, ShieldAlert, Check, X, Database, ExternalLink, Plus, Bell,
  RefreshCw, AlertTriangle,
} from 'lucide-react';

/**
 * /admin/economic — operator UI for the TVK economic quarterly tracker.
 *
 * Goal: minimise friction so the user can paste a number from the latest
 * RBI State Finances / TN Economic Survey / DPIIT FDI release into the right
 * metric without touching curl. The form pulls the live DMK baselines so
 * the metric dropdown is always in sync with the backend (no hand-maintained
 * list).
 *
 * Auth model mirrors /admin: ADMIN_SECRET in a header. We validate by
 * doing a cheap GET first; only after that we render the form.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Baseline {
  key: string;
  label: string;
  sector: string;
  dmk_cagr_pct: number;
  dmk_period: string;
  unit: string;
  nominal: boolean;
  confidence: string;
  source: string;
  source_url?: string;
}

interface ReleaseWatch {
  id: string;
  label: string;
  url: string;
  publisher: string;
  related_metrics: string[];
  cadence_days: number;
  last_checked: string | null;
  last_changed_at: string | null;
  notes: string | null;
  pending_events: number;
}

interface ReleaseEvent {
  id: string;
  watch_id: string;
  detected_at: string;
  old_hash: string | null;
  new_hash: string;
  status: 'pending' | 'acknowledged' | 'dismissed';
  ack_by: string | null;
  ack_at: string | null;
  notes: string | null;
  watch?: {
    id: string;
    label: string;
    url: string;
    publisher: string;
    related_metrics: string[];
  };
}

interface Observation {
  id: string;
  metric_key: string;
  fy: number;
  quarter: number;
  value: number;
  value_type: 'cagr_pct' | 'yoy_pct' | 'level';
  source: string;
  source_url: string | null;
  notes: string | null;
  ingested_at: string;
}

const VALUE_TYPE_HELP: Record<string, string> = {
  cagr_pct: 'CAGR % — observed CAGR over TVK tenure (compare directly to DMK CAGR)',
  yoy_pct:  'YoY % — year-over-year quarterly growth (single-quarter rate)',
  level:    'Level — absolute ₹/$/MW value (used for future CAGR computation)',
};

export default function AdminEconomicPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authMsg, setAuthMsg] = useState('');

  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [releaseEvents, setReleaseEvents] = useState<ReleaseEvent[]>([]);
  const [watches, setWatches] = useState<ReleaseWatch[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [metricKey, setMetricKey]   = useState('');
  const [fy, setFy]                 = useState<number>(2027);
  const [quarter, setQuarter]       = useState<number>(1);
  const [value, setValue]           = useState<string>('');
  const [valueType, setValueType]   = useState<'cagr_pct' | 'yoy_pct' | 'level'>('yoy_pct');
  const [source, setSource]         = useState('');
  const [sourceUrl, setSourceUrl]   = useState('');
  const [notes, setNotes]           = useState('');
  const [submitMsg, setSubmitMsg]   = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Fetch baselines + observations + release watches/events in parallel.
  // None of these read endpoints actually require auth (Supabase RLS is
  // public-read on these tables) — we still send the secret so a wrong
  // value surfaces immediately when the admin POSTs, not on first action.
  async function loadData(s: string) {
    setLoading(true);
    setAuthMsg('');
    try {
      const [bRes, oRes, wRes, eRes] = await Promise.all([
        fetch(`${API}/api/economic/baselines`, { cache: 'no-store' }),
        fetch(`${API}/api/economic/quarterly?limit=200`, {
          headers: { 'x-admin-secret': s },
          cache: 'no-store',
        }),
        fetch(`${API}/api/economic/release-watches`, { cache: 'no-store' }),
        fetch(`${API}/api/economic/release-events?status=pending&limit=20`, {
          cache: 'no-store',
        }),
      ]);
      if (!bRes.ok) throw new Error(`baselines HTTP ${bRes.status}`);
      const bs: Baseline[] = await bRes.json();
      setBaselines(bs);
      if (!metricKey && bs.length) setMetricKey(bs[0].key);

      if (oRes.ok) setObservations(await oRes.json());
      if (wRes.ok) {
        const wj = await wRes.json();
        setWatches(wj.watches ?? []);
      }
      if (eRes.ok) setReleaseEvents(await eRes.json());

      setAuthed(true);
    } catch (e: any) {
      setAuthMsg(e?.message || 'Cannot connect to backend');
    } finally {
      setLoading(false);
    }
  }

  async function ackReleaseEvent(eventId: string, status: 'acknowledged' | 'dismissed', notes: string) {
    try {
      const res = await fetch(`${API}/api/economic/release-events/${eventId}/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReleaseEvents(es => es.filter(e => e.id !== eventId));
    } catch (e: any) {
      alert(`Failed: ${e?.message}`);
    }
  }

  useEffect(() => {
    if (authed) loadData(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function submitObservation(e: React.FormEvent) {
    e.preventDefault();
    setSubmitMsg(null);
    if (!metricKey || !value || !source) {
      setSubmitMsg({ kind: 'err', text: 'Metric, value and source are required.' });
      return;
    }
    const numValue = parseFloat(value);
    if (Number.isNaN(numValue)) {
      setSubmitMsg({ kind: 'err', text: `Value "${value}" is not a number.` });
      return;
    }

    try {
      const res = await fetch(`${API}/api/economic/quarterly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({
          metric_key: metricKey,
          fy,
          quarter,
          value: numValue,
          value_type: valueType,
          source,
          source_url: sourceUrl || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`HTTP ${res.status}: ${detail}`);
      }
      setSubmitMsg({ kind: 'ok', text: `Saved ${metricKey} FY${fy} Q${quarter} = ${numValue} ${valueType}` });
      // Reset value-only so user can fly through several metrics
      setValue('');
      setNotes('');
      // Reload observations
      loadData(secret);
    } catch (e: any) {
      setSubmitMsg({ kind: 'err', text: e?.message || 'Submission failed' });
    }
  }

  // -------- AUTH SCREEN --------------------------------------------------
  if (!authed) {
    return (
      <div className="flex-1 p-6 max-w-md mx-auto w-full mt-20">
        <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <ShieldAlert size={22} className="text-orange-400" /> Admin · Economic Tracker
        </h1>
        <p className="text-gray-500 text-sm mb-4">
          Enter the admin secret to manage TVK quarterly economic observations.
        </p>
        <input
          type="password"
          placeholder="Admin secret"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white"
          onKeyDown={e => { if (e.key === 'Enter') loadData(secret); }}
        />
        <button
          onClick={() => loadData(secret)}
          disabled={loading || !secret}
          className="mt-3 w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-md py-2 font-medium"
        >
          {loading ? 'Authenticating…' : 'Sign in'}
        </button>
        {authMsg && <p className="text-red-400 text-sm mt-3">{authMsg}</p>}
      </div>
    );
  }

  // Lookup helpers
  const baselineByKey = Object.fromEntries(baselines.map(b => [b.key, b]));
  const groupedBySector: Record<string, Baseline[]> = {};
  baselines.forEach(b => {
    (groupedBySector[b.sector] ||= []).push(b);
  });

  const selectedBaseline = baselineByKey[metricKey];

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={22} className="text-orange-400" />
          Economic Tracker
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Record a new TVK-era quarterly observation. The dashboard picks the
          most-recent observation per metric and computes the percentage-point
          delta vs the DMK CAGR baseline.
        </p>
      </div>

      {/* Release-watcher alert panel. Renders only when the auto-ingest
          script has detected publisher-page changes that need admin review. */}
      {releaseEvents.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-700/40 rounded-lg p-5 mb-6">
          <h2 className="text-amber-300 font-semibold mb-3 flex items-center gap-2 text-sm">
            <Bell size={14} className="text-amber-400" />
            New releases detected ({releaseEvents.length})
            <span className="text-amber-500/70 text-xs font-normal">
              · publisher page changed since last review
            </span>
          </h2>
          <div className="space-y-2">
            {releaseEvents.map(ev => (
              <div
                key={ev.id}
                className="bg-black/30 border border-amber-900/40 rounded-md p-3 flex items-start gap-3"
              >
                <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-amber-100 text-sm font-medium">
                    {ev.watch?.label ?? 'Unknown publisher'}
                    <span className="ml-2 text-[10px] text-amber-500/60 uppercase tracking-wider">
                      {ev.watch?.publisher}
                    </span>
                  </div>
                  <div className="text-amber-300/80 text-[11px] mt-0.5 flex items-center gap-3 flex-wrap">
                    <span>detected {new Date(ev.detected_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    {ev.watch?.url && (
                      <a
                        href={ev.watch.url} target="_blank" rel="noopener noreferrer"
                        className="text-orange-400 hover:underline inline-flex items-center gap-0.5"
                      >open page <ExternalLink size={9} /></a>
                    )}
                  </div>
                  {ev.watch?.related_metrics && ev.watch.related_metrics.length > 0 && (
                    <div className="text-[10px] text-amber-500/70 mt-1">
                      Related metrics: {ev.watch.related_metrics.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const note = prompt('Optional note (e.g. "Entered FY27-Q1 GSDP = 8.7%"):') || '';
                      ackReleaseEvent(ev.id, 'acknowledged', note);
                    }}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-2.5 py-1 rounded inline-flex items-center gap-1"
                  >
                    <Check size={11} /> Entered
                  </button>
                  <button
                    onClick={() => ackReleaseEvent(ev.id, 'dismissed', 'no actionable change')}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded inline-flex items-center gap-1"
                  >
                    <X size={11} /> Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form card */}
      <form
        onSubmit={submitObservation}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 mb-8"
      >
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
          <Plus size={14} className="text-emerald-400" />
          New observation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Metric selector */}
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">Metric</span>
            <select
              value={metricKey}
              onChange={e => setMetricKey(e.target.value)}
              className="mt-1 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-white text-sm"
            >
              {Object.entries(groupedBySector).map(([sector, rows]) => (
                <optgroup key={sector} label={sector.toUpperCase()}>
                  {rows.map(b => (
                    <option key={b.key} value={b.key}>
                      {b.label} (DMK: {b.dmk_cagr_pct.toFixed(1)}%)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedBaseline && (
              <p className="text-[10px] text-gray-600 mt-1">
                DMK baseline: <span className="text-gray-400 font-mono">{selectedBaseline.dmk_cagr_pct.toFixed(2)}%</span>
                {' · '}{selectedBaseline.dmk_period}
                {selectedBaseline.source_url && (
                  <a
                    href={selectedBaseline.source_url}
                    target="_blank" rel="noopener noreferrer"
                    className="ml-1 text-orange-400 hover:underline inline-flex items-center gap-0.5"
                  >source <ExternalLink size={9} /></a>
                )}
              </p>
            )}
          </label>

          {/* Value + type */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Value</span>
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="e.g. 7.4"
                className="mt-1 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-white text-sm font-mono"
                required
              />
            </label>
            <label className="block">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Type</span>
              <select
                value={valueType}
                onChange={e => setValueType(e.target.value as any)}
                className="mt-1 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-white text-sm"
              >
                <option value="yoy_pct">YoY %</option>
                <option value="cagr_pct">CAGR %</option>
                <option value="level">Level (₹/$)</option>
              </select>
            </label>
            <p className="col-span-2 text-[10px] text-gray-600 -mt-2 leading-snug">
              {VALUE_TYPE_HELP[valueType]}
            </p>
          </div>

          {/* FY + Quarter */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Fiscal Year</span>
              <input
                type="number"
                min="2026" max="2032"
                value={fy}
                onChange={e => setFy(parseInt(e.target.value || '2027'))}
                className="mt-1 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-white text-sm font-mono"
              />
              <p className="text-[10px] text-gray-600 mt-1">FY27 = year ending 31-Mar-2027</p>
            </label>
            <label className="block">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Quarter</span>
              <select
                value={quarter}
                onChange={e => setQuarter(parseInt(e.target.value))}
                className="mt-1 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-white text-sm"
              >
                <option value={1}>Q1 (Apr–Jun)</option>
                <option value={2}>Q2 (Jul–Sep)</option>
                <option value={3}>Q3 (Oct–Dec)</option>
                <option value={4}>Q4 (Jan–Mar)</option>
              </select>
            </label>
          </div>

          {/* Source */}
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">Source citation</span>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="e.g. RBI State Finances FY27 Q1, Table 12"
              className="mt-1 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-white text-sm"
              required
            />
          </label>
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">Source URL (optional)</span>
            <input
              type="url"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-white text-sm font-mono"
            />
          </label>
        </div>

        {/* Notes */}
        <label className="block mt-4">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Caveats, base-year, sub-component breakdown…"
            rows={2}
            className="mt-1 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-white text-sm"
          />
        </label>

        <div className="flex items-center justify-between mt-5">
          <button
            type="submit"
            className="bg-orange-600 hover:bg-orange-500 text-white rounded-md px-5 py-2 font-medium text-sm"
          >
            Save observation
          </button>
          {submitMsg && (
            <span
              className={`text-xs flex items-center gap-1 ${
                submitMsg.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {submitMsg.kind === 'ok' ? <Check size={12} /> : <X size={12} />}
              {submitMsg.text}
            </span>
          )}
        </div>
      </form>

      {/* Watcher status — show whether automation is running + last-checked
          per publisher so the admin can spot a broken cron quickly. */}
      {watches.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 mb-8">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
            <RefreshCw size={14} className="text-sky-400" />
            Publisher watch status
            <span className="text-gray-600 text-xs font-normal">
              ({watches.length} URLs monitored)
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {watches.map(w => {
              const lastChecked = w.last_checked ? new Date(w.last_checked) : null;
              const lastChanged = w.last_changed_at ? new Date(w.last_changed_at) : null;
              const hoursSinceCheck = lastChecked ? (Date.now() - lastChecked.getTime()) / 3600000 : null;
              const isStale = hoursSinceCheck !== null && hoursSinceCheck > 24 * 8; // older than 8d
              return (
                <div key={w.id} className="bg-black/30 border border-[#2a2a2a] rounded p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <a
                      href={w.url} target="_blank" rel="noopener noreferrer"
                      className="text-gray-200 text-xs font-medium hover:text-orange-400 inline-flex items-center gap-1"
                    >
                      {w.label} <ExternalLink size={9} />
                    </a>
                    {w.pending_events > 0 && (
                      <span className="bg-amber-700 text-amber-100 text-[10px] px-1.5 py-0.5 rounded">
                        {w.pending_events} pending
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-2 flex-wrap">
                    <span>{w.publisher}</span>
                    <span>· every ~{w.cadence_days}d</span>
                    {lastChecked && (
                      <span className={isStale ? 'text-amber-400' : ''}>
                        · last check {lastChecked.toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </span>
                    )}
                    {lastChanged && (
                      <span>· last change {lastChanged.toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Existing observations */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
          <Database size={14} className="text-sky-400" />
          Recorded observations
          <span className="text-gray-600 text-xs font-normal">({observations.length})</span>
        </h2>
        {observations.length === 0 ? (
          <p className="text-gray-500 text-sm italic">
            No observations yet. Submit the first one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500 uppercase tracking-wider text-[10px]">
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left py-2 pr-3">Metric</th>
                  <th className="text-left py-2 pr-3">FY · Q</th>
                  <th className="text-right py-2 pr-3">Value</th>
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-left py-2 pr-3">Source</th>
                  <th className="text-left py-2">Recorded</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {observations.map(o => {
                  const b = baselineByKey[o.metric_key];
                  return (
                    <tr key={o.id} className="border-b border-[#222]">
                      <td className="py-2 pr-3">{b?.label ?? o.metric_key}</td>
                      <td className="py-2 pr-3 font-mono">FY{o.fy} Q{o.quarter}</td>
                      <td className="py-2 pr-3 text-right font-mono">{o.value}</td>
                      <td className="py-2 pr-3 text-gray-500">{o.value_type}</td>
                      <td className="py-2 pr-3">
                        {o.source_url ? (
                          <a href={o.source_url} target="_blank" rel="noopener noreferrer"
                             className="text-orange-400 hover:underline inline-flex items-center gap-0.5">
                            {o.source} <ExternalLink size={9} />
                          </a>
                        ) : o.source}
                      </td>
                      <td className="py-2 text-gray-500">
                        {new Date(o.ingested_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
