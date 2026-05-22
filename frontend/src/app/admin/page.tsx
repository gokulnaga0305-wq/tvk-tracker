'use client';
import { useState, useEffect } from 'react';
import { Incident } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/constants';
import { ShieldAlert, Check, X, Edit2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [queue, setQueue] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadQueue(s: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/incidents/?status=pending_review&limit=50`, {
        headers: { 'x-admin-secret': s },
      });
      if (res.status === 403) { setMessage('Wrong secret'); return; }
      const data = await res.json();
      setQueue(data);
      setAuthed(true);
    } catch {
      setMessage('Cannot connect to backend');
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string, isCredit: boolean, creditText: string) {
    await fetch(`${API}/api/incidents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ status: 'approved', is_credit_steal: isCredit, original_credit: creditText || null }),
    });
    setQueue(q => q.filter(i => i.id !== id));
  }

  async function reject(id: string) {
    await fetch(`${API}/api/incidents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ status: 'rejected' }),
    });
    setQueue(q => q.filter(i => i.id !== id));
  }

  if (!authed) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 w-80">
          <div className="flex items-center gap-2 mb-6">
            <ShieldAlert size={20} className="text-orange-400" />
            <h1 className="text-white font-bold">Admin Panel</h1>
          </div>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadQueue(secret)}
            className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg mb-3 focus:outline-none focus:border-orange-500"
          />
          {message && <p className="text-red-400 text-xs mb-3">{message}</p>}
          <button
            onClick={() => loadQueue(secret)}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white text-sm py-2 rounded-lg transition-colors"
          >
            {loading ? 'Connecting...' : 'Enter'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert size={22} className="text-orange-400" />
            Fact-Check Queue
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {queue.length} incident{queue.length !== 1 ? 's' : ''} pending review (AI confidence &lt; 75%)
          </p>
        </div>
        <button onClick={() => loadQueue(secret)} className="text-xs text-gray-500 hover:text-white border border-[#333] px-3 py-1.5 rounded-lg">
          Refresh
        </button>
      </div>

      {queue.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Check size={32} className="mx-auto mb-3 opacity-30" />
          <p>Queue is empty — all incidents reviewed.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {queue.map(incident => (
          <QueueCard
            key={incident.id}
            incident={incident}
            onApprove={(isCredit, creditText) => approve(incident.id, isCredit, creditText)}
            onReject={() => reject(incident.id)}
          />
        ))}
      </div>
    </div>
  );
}

function QueueCard({
  incident,
  onApprove,
  onReject,
}: {
  incident: Incident;
  onApprove: (isCredit: boolean, creditText: string) => void;
  onReject: () => void;
}) {
  const [isCredit, setIsCredit] = useState(incident.is_credit_steal);
  const [creditText, setCreditText] = useState(incident.original_credit || '');

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <span className="text-[11px] font-semibold bg-[#333] text-gray-300 px-2 py-0.5 rounded uppercase mr-2">
            {CATEGORY_LABELS[incident.category] || incident.category}
          </span>
          <span className="text-[11px] text-yellow-400">AI conf: {Math.round(incident.ai_confidence * 100)}%</span>
        </div>
        <span className="text-xs text-gray-600">{new Date(incident.incident_date).toLocaleDateString('en-IN')}</span>
      </div>

      <h3 className="text-white font-semibold text-sm mb-2">{incident.title}</h3>
      <p className="text-gray-400 text-xs leading-relaxed mb-4">{incident.summary}</p>

      {/* Source links */}
      {incident.source_urls.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {incident.source_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 bg-[#222] px-2 py-1 rounded">
              Source {i + 1} <ExternalLink size={10} />
            </a>
          ))}
        </div>
      )}

      {/* Credit steal toggle */}
      <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isCredit}
            onChange={e => setIsCredit(e.target.checked)}
            className="accent-blue-500"
          />
          Mark as Credit Steal
        </label>
        {isCredit && (
          <input
            type="text"
            value={creditText}
            onChange={e => setCreditText(e.target.value)}
            placeholder="What was originally done by DMK/previous govt?"
            className="w-full bg-[#1a1a1a] border border-[#333] text-white text-xs px-3 py-2 rounded focus:outline-none focus:border-blue-500"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(isCredit, creditText)}
          className="flex items-center gap-2 bg-green-900 hover:bg-green-800 text-green-300 text-sm px-4 py-2 rounded-lg border border-green-800 transition-colors"
        >
          <Check size={14} /> Approve & Publish
        </button>
        <button
          onClick={onReject}
          className="flex items-center gap-2 bg-red-950 hover:bg-red-900 text-red-400 text-sm px-4 py-2 rounded-lg border border-red-900 transition-colors"
        >
          <X size={14} /> Reject
        </button>
      </div>
    </div>
  );
}
