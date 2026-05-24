'use client';
import { useState, useEffect } from 'react';
import IncidentCard from '@/components/IncidentCard';
import ShareCardModal from '@/components/ShareCardModal';
import { Incident } from '@/lib/api';
import { Copy, AlertCircle, ShieldCheck, Download, Sun } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CreditStealsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterFor, setCounterFor] = useState<Incident | null>(null);

  useEffect(() => {
    fetch(`${API}/api/incidents/?is_credit_steal=true&limit=100`)
      .then(r => r.json())
      .then(setIncidents)
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false));
  }, []);

  // Sort: verified credit-steals first (they're bulletproof for sharing),
  // then those with DMK precedent matches, then the rest
  const sorted = [...incidents].sort((a, b) => {
    const aVerified = (a.verification_status === 'multi_source_verified' || a.verification_status === 'admin_verified') ? 1 : 0;
    const bVerified = (b.verification_status === 'multi_source_verified' || b.verification_status === 'admin_verified') ? 1 : 0;
    if (aVerified !== bVerified) return bVerified - aVerified;
    const aEvid = a.dmk_evidence?.length ?? 0;
    const bEvid = b.dmk_evidence?.length ?? 0;
    return bEvid - aEvid;
  });

  const verifiedCount = incidents.filter(i =>
    i.verification_status === 'multi_source_verified' || i.verification_status === 'admin_verified'
  ).length;
  const withReceiptsCount = incidents.filter(i => (i.dmk_evidence?.length ?? 0) > 0).length;

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
      {counterFor && (
        <ShareCardModal incident={counterFor} onClose={() => setCounterFor(null)} />
      )}

      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Copy size={22} className="text-blue-400" />
          Credit Steals
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Incidents where TVK government claimed credit for schemes, projects, or achievements
          initiated or completed by the previous DMK government.
        </p>
      </div>

      {/* Context banner */}
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg px-4 py-3 mb-4 flex gap-3">
        <AlertCircle size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-300">
          <strong className="text-blue-200">What is credit stealing?</strong> When a new government
          relaunches, renames, or takes ownership of existing schemes without acknowledging the
          previous administration's work — often to manipulate public perception and distort political history.
        </div>
      </div>

      {/* Counter-Narrative banner — explains the new card variant */}
      <div className="bg-gradient-to-r from-yellow-950/60 to-amber-950/40 border border-yellow-700/40 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
        <Sun size={18} className="text-yellow-400 mt-0.5 shrink-0" />
        <div className="text-sm">
          <div className="text-yellow-200 font-semibold">
            New: Counter-Narrative Cards
          </div>
          <div className="text-yellow-300/80 mt-0.5 leading-relaxed">
            Every credit-steal now has a one-tap shareable image: TVK's claim on top, DMK
            government's documented receipt on the bottom. Download and post on WhatsApp/Twitter
            with proof — no caption needed.
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3">
          <div className="text-3xl font-bold text-blue-400">{loading ? '…' : incidents.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Documented</div>
        </div>
        <div className="bg-[#1a1a1a] border border-emerald-900/40 rounded-lg px-4 py-3">
          <div className="text-3xl font-bold text-emerald-400 flex items-baseline gap-1.5">
            {loading ? '…' : verifiedCount}
            <ShieldCheck size={16} />
          </div>
          <div className="text-xs text-emerald-500/70 uppercase tracking-wider mt-1">Multi-source verified</div>
        </div>
        <div className="bg-[#1a1a1a] border border-yellow-900/40 rounded-lg px-4 py-3">
          <div className="text-3xl font-bold text-yellow-400 flex items-baseline gap-1.5">
            {loading ? '…' : withReceiptsCount}
            <Sun size={16} />
          </div>
          <div className="text-xs text-yellow-500/70 uppercase tracking-wider mt-1">With DMK archive receipts</div>
        </div>
      </div>

      {!loading && incidents.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Copy size={32} className="mx-auto mb-3 opacity-30" />
          <p>No credit steal incidents documented yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map(i => (
          <div key={i.id} className="relative">
            <IncidentCard incident={i} />
            {/* Counter-card quick action — always visible (mobile has no hover).
                Positioned to avoid clashing with the existing share button in
                the IncidentCard footer. */}
            <button
              onClick={() => setCounterFor(i)}
              title="Download Counter-Narrative Card"
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-md shadow-md transition-colors"
            >
              <Download size={12} /> Receipts card
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
