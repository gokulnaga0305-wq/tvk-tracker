'use client';
import { useState, useEffect } from 'react';
import IncidentCard from '@/components/IncidentCard';
import { Incident } from '@/lib/api';
import { Search, Filter } from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CategoryOption {
  category: string;
  label: string;
  count: number;
  verified: number;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [creditStealsOnly, setCreditStealsOnly] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch the live category list with counts so chips only show
  // categories that actually have data, with current counts.
  useEffect(() => {
    fetch(`${API}/api/incidents/categories`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then((data: CategoryOption[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    // limit=50 is the current safe cap: the backend's enrichment code
    // (sources + dmk_evidence + tag normalization) hits a Supabase IN()
    // payload size limit somewhere between 50 and 75 incidents per page.
    // TODO(perf): chunk the enrichment IN() calls so we can lift this.
    const params = new URLSearchParams({ limit: '50' });
    if (category) params.set('category', category);
    if (creditStealsOnly) params.set('is_credit_steal', 'true');
    fetch(`${API}/api/incidents/?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => setIncidents(Array.isArray(data) ? data : []))
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
          {categories.map(c => (
            <option key={c.category} value={c.category}>
              {c.label} ({c.count})
            </option>
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

      {/* Category pills — dynamically built from the backend so chips
          always match real data. No more "ghost" chips for categories
          the AI never assigns, no more missing chips for categories
          the AI does assign. Counts shown so users see scale at a glance. */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setCategory('')}
          className={clsx('text-xs px-3 py-1.5 rounded-full border transition-colors',
            !category ? 'bg-orange-600 border-orange-600 text-white' : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:text-white'
          )}
        >
          All ({categories.reduce((s, c) => s + c.count, 0)})
        </button>
        {categories.map(c => (
          <button
            key={c.category}
            onClick={() => setCategory(c.category === category ? '' : c.category)}
            className={clsx('text-xs px-3 py-1.5 rounded-full border transition-colors',
              category === c.category
                ? 'bg-orange-600 border-orange-600 text-white'
                : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:text-white'
            )}
            title={`${c.verified} verified of ${c.count} total`}
          >
            {c.label} <span className="text-[10px] opacity-70 ml-0.5">({c.count})</span>
          </button>
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
