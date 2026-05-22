'use client';

import { useState, useEffect } from 'react';
import { Incident, CitizenReport } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/constants';
import {
  ShieldAlert, Check, X, ExternalLink, ShieldCheck, AlertTriangle,
  MessageSquarePlus, ArrowUpRight, Trash2,
} from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type AdminTab = 'pending_verification' | 'pending_review' | 'citizen_reports';

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<AdminTab>('pending_verification');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadData(s: string, t: AdminTab) {
    setLoading(true);
    setMessage('');
    try {
      if (t === 'citizen_reports') {
        const res = await fetch(`${API}/api/citizen-reports/?status=pending_moderation`, {
          headers: { 'x-admin-secret': s },
        });
        if (res.status === 403) { setMessage('Wrong secret'); return; }
        setReports(await res.json());
        setAuthed(true);
      } else {
        // pending_verification: status=pending_review + verification_status=pending_verification
        // pending_review: anything else with status=pending_review
        const status = 'pending_review';
        const url = t === 'pending_verification'
          ? `${API}/api/incidents/?status=${status}&verification_status=pending_verification&limit=100`
          : `${API}/api/incidents/?status=${status}&limit=100`;
        const res = await fetch(url, { headers: { 'x-admin-secret': s } });
        if (res.status === 403) { setMessage('Wrong secret'); return; }
        setIncidents(await res.json());
        setAuthed(true);
      }
    } catch {
      setMessage('Cannot connect to backend');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authed) loadData(secret, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function verifyIncident(id: string) {
    await fetch(`${API}/api/incidents/${id}/verify`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret },
    });
    setIncidents(arr => arr.filter(i => i.id !== id));
  }

  async function rejectIncident(id: string) {
    await fetch(`${API}/api/incidents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ status: 'rejected' }),
    });
    setIncidents(arr => arr.filter(i => i.id !== id));
  }

  async function retractIncident(id: string, reason: string) {
    await fetch(`${API}/api/incidents/${id}/retract?reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret },
    });
    setIncidents(arr => arr.filter(i => i.id !== id));
  }

  async function approveReport(id: string) {
    await fetch(`${API}/api/citizen-reports/${id}/approve`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret },
    });
    setReports(arr => arr.filter(r => r.id !== id));
  }

  async function rejectReport(id: string, reason: string) {
    await fetch(`${API}/api/citizen-reports/${id}/reject?reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret },
    });
    setReports(arr => arr.filter(r => r.id !== id));
  }

  async function promoteReport(id: string) {
    await fetch(`${API}/api/citizen-reports/${id}/promote-to-incident`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret },
    });
    setReports(arr => arr.filter(r => r.id !== id));
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
            onKeyDown={e => e.key === 'Enter' && loadData(secret, tab)}
            className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg mb-3 focus:outline-none focus:border-orange-500"
          />
          {message && <p className="text-red-400 text-xs mb-3">{message}</p>}
          <button
            onClick={() => loadData(secret, tab)}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white text-sm py-2 rounded-lg transition-colors"
          >
            {loading ? 'Connecting…' : 'Enter'}
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: any; count?: number }[] = [
    { key: 'pending_verification', label: 'Pending Verification', icon: ShieldAlert },
    { key: 'pending_review', label: 'Pending Review (Low Conf)', icon: AlertTriangle },
    { key: 'citizen_reports', label: 'Citizen Reports', icon: MessageSquarePlus },
  ];

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert size={22} className="text-orange-400" />
          Admin Panel
        </h1>
        <button onClick={() => loadData(secret, tab)} className="text-xs text-gray-500 hover:text-white border border-[#333] px-3 py-1.5 rounded-lg">
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors',
              tab === t.key
                ? 'bg-orange-600 border-orange-600 text-white'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white'
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-600 text-sm">Loading…</div>}

      {!loading && tab === 'citizen_reports' && (
        <CitizenList
          reports={reports}
          onApprove={approveReport}
          onReject={(id, reason) => rejectReport(id, reason)}
          onPromote={promoteReport}
        />
      )}

      {!loading && tab !== 'citizen_reports' && (
        <IncidentList
          incidents={incidents}
          onVerify={verifyIncident}
          onReject={rejectIncident}
          onRetract={(id, reason) => retractIncident(id, reason)}
        />
      )}
    </div>
  );
}

function IncidentList({
  incidents,
  onVerify,
  onReject,
  onRetract,
}: {
  incidents: Incident[];
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onRetract: (id: string, reason: string) => void;
}) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">
        <Check size={32} className="mx-auto mb-3 opacity-30" />
        <p>Nothing in queue.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {incidents.map(inc => (
        <QueueCard
          key={inc.id}
          incident={inc}
          onVerify={() => onVerify(inc.id)}
          onReject={() => onReject(inc.id)}
          onRetract={r => onRetract(inc.id, r)}
        />
      ))}
    </div>
  );
}

function QueueCard({
  incident,
  onVerify,
  onReject,
  onRetract,
}: {
  incident: Incident;
  onVerify: () => void;
  onReject: () => void;
  onRetract: (reason: string) => void;
}) {
  const [retractReason, setRetractReason] = useState('');

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold bg-[#333] text-gray-300 px-2 py-0.5 rounded uppercase">
            {CATEGORY_LABELS[incident.category] || incident.category}
          </span>
          {incident.is_credit_steal && (
            <span className="text-[11px] font-semibold border border-blue-500 text-blue-400 px-2 py-0.5 rounded uppercase">
              Credit Steal
            </span>
          )}
          <span className="text-[11px] text-yellow-400">
            AI conf: {Math.round(incident.ai_confidence * 100)}%
          </span>
          <span className="text-[11px] text-gray-500">{incident.source_count || 1} source(s)</span>
        </div>
        <span className="text-xs text-gray-600">
          {new Date(incident.incident_date).toLocaleDateString('en-IN')}
        </span>
      </div>

      <h3 className="text-white font-semibold text-sm mb-2">{incident.title}</h3>
      <p className="text-gray-400 text-xs leading-relaxed mb-3">{incident.summary}</p>

      {incident.source_urls?.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {incident.source_urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 bg-[#222] px-2 py-1 rounded"
            >
              Source {i + 1} <ExternalLink size={10} />
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onVerify}
          className="flex items-center gap-2 bg-green-900 hover:bg-green-800 text-green-300 text-sm px-4 py-2 rounded-lg border border-green-800"
        >
          <ShieldCheck size={14} /> Approve & Verify
        </button>
        <button
          onClick={onReject}
          className="flex items-center gap-2 bg-red-950 hover:bg-red-900 text-red-400 text-sm px-4 py-2 rounded-lg border border-red-900"
        >
          <X size={14} /> Reject
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <input
            type="text"
            value={retractReason}
            onChange={e => setRetractReason(e.target.value)}
            placeholder="Retraction reason"
            className="bg-[#111] border border-[#333] text-white text-xs px-2 py-1.5 rounded w-44"
          />
          <button
            onClick={() => retractReason.trim() && onRetract(retractReason)}
            className="text-xs bg-[#333] hover:bg-[#444] text-gray-300 px-3 py-1.5 rounded"
            title="Mark retracted with reason"
          >
            Retract
          </button>
        </div>
      </div>
    </div>
  );
}

function CitizenList({
  reports,
  onApprove,
  onReject,
  onPromote,
}: {
  reports: CitizenReport[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onPromote: (id: string) => void;
}) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">
        <MessageSquarePlus size={32} className="mx-auto mb-3 opacity-30" />
        <p>No citizen reports awaiting moderation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {reports.map(r => (
        <CitizenCard
          key={r.id}
          report={r}
          onApprove={() => onApprove(r.id)}
          onReject={reason => onReject(r.id, reason)}
          onPromote={() => onPromote(r.id)}
        />
      ))}
    </div>
  );
}

function CitizenCard({
  report,
  onApprove,
  onReject,
  onPromote,
}: {
  report: CitizenReport;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onPromote: () => void;
}) {
  const [rejectReason, setRejectReason] = useState('');

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2 text-[11px]">
        <span className="bg-[#333] text-gray-300 px-2 py-0.5 rounded uppercase">
          {report.category ? (CATEGORY_LABELS[report.category] || report.category) : 'Uncategorized'}
        </span>
        {report.location && <span className="text-gray-500">{report.location}</span>}
        {report.reporter_name && <span className="text-gray-500">by {report.reporter_name}</span>}
        <span className="text-gray-600 ml-auto">
          {new Date(report.created_at).toLocaleString('en-IN')}
        </span>
      </div>
      <h3 className="text-white font-semibold text-sm mb-2">{report.title}</h3>
      <p className="text-gray-400 text-xs leading-relaxed mb-3">{report.description}</p>

      {report.image_urls?.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {report.image_urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noopener noreferrer"
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 bg-[#222] px-2 py-1 rounded">
              Image {i + 1} <ExternalLink size={10} />
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={onApprove}
          className="flex items-center gap-2 bg-green-900 hover:bg-green-800 text-green-300 text-sm px-4 py-2 rounded-lg border border-green-800"
        >
          <Check size={14} /> Approve (public)
        </button>
        <button
          onClick={onPromote}
          className="flex items-center gap-2 bg-orange-900 hover:bg-orange-800 text-orange-300 text-sm px-4 py-2 rounded-lg border border-orange-800"
        >
          <ArrowUpRight size={14} /> Promote to Incident
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <input
            type="text"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Reject reason"
            className="bg-[#111] border border-[#333] text-white text-xs px-2 py-1.5 rounded w-44"
          />
          <button
            onClick={() => rejectReason.trim() && onReject(rejectReason)}
            className="flex items-center gap-1 bg-red-950 hover:bg-red-900 text-red-400 text-xs px-3 py-1.5 rounded border border-red-900"
          >
            <Trash2 size={11} /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}
