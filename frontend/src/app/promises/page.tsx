'use client';
import { useState, useEffect } from 'react';
import { Promise_ } from '@/lib/api';
import { PROMISE_STATUS_COLORS } from '@/lib/constants';
import { CheckSquare, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'kept', label: 'Kept' },
  { key: 'broken', label: 'Broken' },
  { key: 'partial', label: 'Partial' },
];

// Days a promise is past its deadline while still not kept. Returns null
// if there's no deadline, it's already kept, or the deadline is in the future.
function daysOverdue(promise: Promise_): number | null {
  if (!promise.deadline || promise.status === 'kept') return null;
  const dl = new Date(promise.deadline).getTime();
  const now = Date.now();
  if (now <= dl) return null;
  return Math.floor((now - dl) / 86_400_000);
}

function PromiseRow({ promise }: { promise: Promise_ }) {
  const colorClass = PROMISE_STATUS_COLORS[promise.status] || 'bg-gray-700 text-gray-300';
  const overdue = daysOverdue(promise);
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#333] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-white text-sm leading-relaxed">{promise.text}</p>
          {promise.notes && (
            <p className="text-gray-500 text-xs mt-2 italic">{promise.notes}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 flex-wrap">
            <span>Category: {promise.category.replace(/_/g, ' ')}</span>
            {promise.deadline && <span>Deadline: {new Date(promise.deadline).toLocaleDateString('en-IN')}</span>}
            {overdue !== null && (
              <span className="font-semibold text-red-400 bg-red-950/40 px-2 py-0.5 rounded">
                ⏱ {overdue} {overdue === 1 ? 'day' : 'days'} overdue, still undelivered
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={clsx('text-xs font-semibold px-2 py-1 rounded uppercase', colorClass)}>
            {promise.status}
          </span>
          {promise.evidence_url && (
            <a href={promise.evidence_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300">
              Evidence <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PromisesPage() {
  const [promises, setPromises] = useState<Promise_[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');

  useEffect(() => {
    const url = tab ? `${API}/api/promises/?status=${tab}` : `${API}/api/promises/`;
    fetch(url)
      .then(r => r.json())
      .then(setPromises)
      .catch(() => setPromises([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const kept = promises.filter(p => p.status === 'kept').length;
  const total = promises.length;
  const pct = total > 0 ? Math.round((kept / total) * 100) : 0;

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckSquare size={22} className="text-green-400" />
          Promise Tracker
        </h1>
        <p className="text-gray-500 text-sm mt-1">TVK government election manifesto commitments</p>
      </div>

      {/* Progress bar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Promises kept</span>
          <span className="text-white font-semibold">{kept}/{total} ({pct}%)</span>
        </div>
        <div className="h-2 bg-[#333] rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-600">
          <span className="text-green-400">{promises.filter(p => p.status === 'kept').length} Kept</span>
          <span className="text-red-400">{promises.filter(p => p.status === 'broken').length} Broken</span>
          <span className="text-yellow-400">{promises.filter(p => p.status === 'partial').length} Partial</span>
          <span className="text-gray-400">{promises.filter(p => p.status === 'pending').length} Pending</span>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setLoading(true); }}
            className={clsx('text-sm px-4 py-1.5 rounded-lg border transition-colors',
              tab === t.key
                ? 'bg-orange-600 border-orange-600 text-white'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white'
            )}
          >{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-600 text-sm">Loading...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {promises.map(p => <PromiseRow key={p.id} promise={p} />)}
          {promises.length === 0 && (
            <p className="text-center text-gray-600 py-12">
              No promises found. Connect backend to load data.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
