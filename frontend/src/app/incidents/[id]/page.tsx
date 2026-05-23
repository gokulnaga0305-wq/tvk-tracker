'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Share2 } from 'lucide-react';
import IncidentCard from '@/components/IncidentCard';
import ShareCardModal from '@/components/ShareCardModal';
import { Incident } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/incidents/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setIncident(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">Loading…</div>
    );
  }

  if (notFound || !incident) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-8">
        <p className="text-lg mb-4">Incident not found</p>
        <Link href="/incidents" className="text-orange-400 hover:text-orange-300 text-sm">
          ← Back to incidents
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-3xl mx-auto w-full">
      {shareOpen && <ShareCardModal incident={incident} onClose={() => setShareOpen(false)} />}

      {/* Back nav + share */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/incidents"
          className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={14} /> All incidents
        </Link>
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Share2 size={14} /> Share as Image
        </button>
      </div>

      {/* Full card */}
      <IncidentCard incident={incident} />

      {/* Audit log (if present) */}
      {incident.audit_log && incident.audit_log.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs uppercase tracking-widest text-gray-600 mb-3">Audit Log</h2>
          <div className="flex flex-col gap-2">
            {incident.audit_log.map((entry: any, i: number) => (
              <div
                key={i}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-xs text-gray-400"
              >
                <span className="text-gray-300 font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                {entry.from_value && <span className="mx-2 text-gray-600">{entry.from_value} →</span>}
                {entry.to_value && <span className="text-gray-300">{entry.to_value}</span>}
                {entry.reason && <span className="ml-3 text-gray-600 italic">{entry.reason}</span>}
                <span className="ml-3 text-gray-700">
                  {new Date(entry.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
