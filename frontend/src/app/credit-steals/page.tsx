'use client';
import { useState, useEffect } from 'react';
import IncidentCard from '@/components/IncidentCard';
import ShareCardModal from '@/components/ShareCardModal';
import { Incident } from '@/lib/api';
import { Copy, AlertCircle, ShieldCheck, Download, Sun, Megaphone, ExternalLink, BadgeCheck } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PropSteal {
  id: string;
  title: string;
  description: string | null;
  propaganda_type: string;
  favoring: string | null;
  status: string;
  debunk_source: string | null;
  debunk_url: string | null;
  source_urls: string[] | null;
  tags: string[] | null;
  incident_date: string | null;
}

export default function CreditStealsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [propSteals, setPropSteals] = useState<PropSteal[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterFor, setCounterFor] = useState<Incident | null>(null);

  useEffect(() => {
    fetch(`${API}/api/incidents/?is_credit_steal=true&limit=100`)
      .then(r => r.json())
      .then(setIncidents)
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false));
    // Propaganda misattributions = credit-steals by fan/page cards (a card
    // crediting TVK for something DMK or the Centre actually did). They live
    // in propaganda_events; pull the ones tagged credit_steal / misattributed.
    fetch(`${API}/api/propaganda/?limit=200`)
      .then(r => r.json())
      .then((rows: PropSteal[]) => setPropSteals(
        (Array.isArray(rows) ? rows : []).filter(p =>
          p.tags?.includes('credit_steal') || p.propaganda_type === 'misattributed_event')))
      .catch(() => setPropSteals([]));
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
          Two kinds, one place: <span className="text-gray-400">(1) the TVK government</span> claiming credit for DMK-era
          schemes/projects, and <span className="text-gray-400">(2) fan/page propaganda cards</span> misattributing
          DMK or Central actions to CM Vijay. Each carries its receipt.
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
          <div className="text-3xl font-bold text-blue-400">{loading ? '…' : incidents.length + propSteals.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Documented ({incidents.length} govt · {propSteals.length} propaganda)</div>
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

      {sorted.length > 0 && (
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
          <Copy size={12} className="text-blue-400" /> Government credit-grabs ({sorted.length})
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

      {/* Propaganda misattributions — credit-steals by fan/page cards */}
      {propSteals.length > 0 && (
        <div className="mt-8">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
            <Megaphone size={12} className="text-rose-400" /> Propaganda misattributions ({propSteals.length})
          </div>
          <p className="text-[12px] text-gray-600 mb-3">
            Cards/reels crediting CM Vijay for something the DMK government or the Centre actually did.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {propSteals.map(p => {
              const debunked = p.status === 'debunked';
              const links = (p.source_urls || []).filter(u => /^https?:\/\//.test(u));
              return (
                <div key={p.id} className="rounded-lg border border-rose-900/40 bg-[#1a1a1a] p-4">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${debunked ? 'bg-emerald-700 text-emerald-50' : 'bg-amber-600 text-amber-50'}`}>
                      {debunked ? 'DEBUNKED' : 'UNDER REVIEW'}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">{p.propaganda_type.replace(/_/g, ' ')}</span>
                    {p.favoring && <span className="text-[10px] text-rose-300/80 ml-auto">favours {p.favoring}</span>}
                  </div>
                  <h3 className="text-white text-sm font-medium leading-snug mb-1">{p.title}</h3>
                  {p.description && <p className="text-gray-400 text-[12.5px] leading-relaxed">{p.description}</p>}
                  {(p.debunk_source || links.length > 0) && (
                    <div className="flex items-start gap-1.5 mt-2.5 pt-2.5 border-t border-[#262626]">
                      <BadgeCheck size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-gray-500">
                        {p.debunk_source && <span>Debunked by {p.debunk_source}. </span>}
                        {links.map((u, idx) => (
                          <a key={idx} href={u} target="_blank" rel="noopener noreferrer"
                            className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-0.5 mr-2">
                            source{links.length > 1 ? ` ${idx + 1}` : ''} <ExternalLink size={9} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
