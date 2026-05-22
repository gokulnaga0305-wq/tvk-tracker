'use client';
import { useState, useEffect } from 'react';
import IncidentCard from '@/components/IncidentCard';
import { Incident } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/constants';
import { Search, Filter } from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [creditStealsOnly, setCreditStealsOnly] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (category) params.set('category', category);
    if (creditStealsOnly) params.set('is_credit_steal', 'true');
    fetch(`${API}/api/incidents/?${params}`)
      .then(r => r.json())
      .then(setIncidents)
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false));
  }, [category, creditStealsOnly]);

  const filtered = search
    ? incidents.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.summary.toLowerCase().includes(search.toLowerCase())
      )
    : incidents;

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Incidents</h1>
        <p className="text-gray-500 text-sm mt-1">All documented incidents by the TVK government</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm pl-9 pr-4 py-2 rounded-lg w-64 focus:outline-none focus:border-orange-500"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => setCreditStealsOnly(v => !v)}
          className={clsx(
            'text-sm px-4 py-2 rounded-lg border transition-colors',
            creditStealsOnly
              ? 'bg-blue-900 border-blue-500 text-blue-300'
              : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white'
          )}
        >
          Credit Steals only
        </button>
        <span className="ml-auto text-gray-600 text-sm self-center">
          {filtered.length} incident{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setCategory('')}
          className={clsx('text-xs px-3 py-1.5 rounded-full border transition-colors',
            !category ? 'bg-orange-600 border-orange-600 text-white' : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:text-white'
          )}
        >All</button>
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setCategory(k === category ? '' : k)}
            className={clsx('text-xs px-3 py-1.5 rounded-full border transition-colors',
              category === k ? 'bg-orange-600 border-orange-600 text-white' : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:text-white'
            )}
          >{v}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-600 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Filter size={32} className="mx-auto mb-3 opacity-30" />
          <p>No incidents found. {!category && !creditStealsOnly && 'Connect your backend to load live data.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(i => <IncidentCard key={i.id} incident={i} />)}
        </div>
      )}
    </div>
  );
}
