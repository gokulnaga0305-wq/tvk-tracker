'use client';
import { useState, useEffect } from 'react';
import IncidentCard from '@/components/IncidentCard';
import { Incident } from '@/lib/api';
import { Copy, AlertCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CreditStealsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/incidents/?is_credit_steal=true&limit=100`)
      .then(r => r.json())
      .then(setIncidents)
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
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
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg px-4 py-3 mb-6 flex gap-3">
        <AlertCircle size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-300">
          <strong className="text-blue-200">What is credit stealing?</strong> When a new government
          relaunches, renames, or takes ownership of existing schemes without acknowledging the
          previous administration's work — often to manipulate public perception and distort political history.
        </div>
      </div>

      <div className="mb-4 text-gray-500 text-sm">
        {loading ? 'Loading...' : `${incidents.length} documented instance${incidents.length !== 1 ? 's' : ''}`}
      </div>

      {!loading && incidents.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Copy size={32} className="mx-auto mb-3 opacity-30" />
          <p>No credit steal incidents documented yet. Connect your backend to load live data.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {incidents.map(i => <IncidentCard key={i.id} incident={i} />)}
      </div>
    </div>
  );
}
