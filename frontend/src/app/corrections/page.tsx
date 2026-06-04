'use client';
import { useState, useEffect } from 'react';
import { ShieldCheck, ExternalLink, RotateCcw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Correction {
  id: string;
  title: string;
  category: string;
  incident_date: string | null;
  action: 'retracted' | 'rejected';
  reason: string;
  at: string | null;
}

export default function CorrectionsPage() {
  const [items, setItems] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/incidents/corrections`)
      .then(r => (r.ok ? r.json() : { corrections: [] }))
      .then(d => setItems(d.corrections || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <RotateCcw size={22} className="text-emerald-400" />
          Corrections Log
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Every incident we retracted or rejected after review — published openly.
        </p>
      </div>

      {/* Why this page exists — the credibility statement */}
      <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-4 mb-6 flex items-start gap-3">
        <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-emerald-100/80 text-sm leading-relaxed">
          We hold the government to a 2-source verification standard, and we hold
          ourselves to it too. When something we published turns out to be wrong,
          unverifiable, or wrongly attributed, we <strong className="text-white">retract
          it and record why here</strong> — we don&apos;t silently delete. A tracker that
          shows its mistakes is more trustworthy than one that pretends it never
          makes any.
        </p>
      </div>

      {loading ? (
        <div className="text-gray-600 text-sm">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 text-center">
          <p className="text-gray-400 text-sm">
            No corrections yet. When we retract or reject a published incident,
            it appears here with the reason.
          </p>
        </div>
      ) : (
        <>
          <p className="text-gray-600 text-xs mb-3">{items.length} corrections on record</p>
          <div className="flex flex-col gap-3">
            {items.map(c => (
              <div
                key={c.id}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-sm leading-relaxed line-through decoration-gray-600">
                      {c.title}
                    </p>
                    <p className="text-amber-300/80 text-xs mt-2 leading-relaxed">
                      <span className="text-gray-500">Reason:</span> {c.reason}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      <span>{(c.category || 'other').replace(/_/g, ' ')}</span>
                      {c.incident_date && (
                        <span>· event {new Date(c.incident_date).toLocaleDateString('en-IN')}</span>
                      )}
                      {c.at && (
                        <span>· corrected {new Date(c.at).toLocaleDateString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={
                      'text-xs font-semibold px-2 py-1 rounded uppercase shrink-0 ' +
                      (c.action === 'retracted'
                        ? 'bg-rose-900/50 text-rose-300'
                        : 'bg-gray-700 text-gray-300')
                    }
                  >
                    {c.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 text-center">
        <a href="/methodology" className="text-xs text-gray-500 hover:text-emerald-400 inline-flex items-center gap-1">
          How we verify incidents <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
