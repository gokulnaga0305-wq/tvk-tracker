'use client';

import { useEffect, useState } from 'react';
import { Calendar, ExternalLink, Database, Filter, Search } from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Item = {
  id: string;
  source: string;
  source_url: string | null;
  announcement_date: string;
  title: string;
  content: string | null;
  media_urls: string[];
  tags: string[];
  scheme_name_hint: string | null;
};

type Stats = {
  dmk_website: number;
  cmo_tamil_nadu: number;
  tn_dipr: number;
  manual: number;
  total: number;
  top_tags: [string, number][];
};

const SOURCE_LABEL: Record<string, string> = {
  dmk_website: 'dmk.in',
  cmo_tamil_nadu: '@CMOTamilnadu',
  tn_dipr: '@TNDIPRNEWS',
  manual: 'Admin',
};

const SOURCE_COLOR: Record<string, string> = {
  dmk_website: 'bg-red-900/40 text-red-300 border-red-800/40',
  cmo_tamil_nadu: 'bg-blue-900/40 text-blue-300 border-blue-800/40',
  tn_dipr: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40',
  manual: 'bg-gray-700 text-gray-300 border-gray-600',
};

export default function DmkTimelinePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 30;

  useEffect(() => {
    fetch(`${API}/api/dmk-archive/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (source) params.set('source', source);
    if (tag) params.set('tag', tag);
    if (year) params.set('year', year);
    if (q) params.set('q', q);
    fetch(`${API}/api/dmk-archive/timeline?${params}`)
      .then(r => r.json())
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [source, tag, year, q, offset]);

  function reset() {
    setSource(''); setTag(''); setYear(''); setQ(''); setOffset(0);
  }

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database size={22} className="text-red-400" />
          DMK 2021-2026 Timeline
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          What the DMK government did during its 2021-2026 tenure. Used as the
          reference record for credit-steal detection.
        </p>
      </div>

      {/* Stats panel */}
      {stats && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-4">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</span>
            <span className="text-gray-500 text-sm">total archive items</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => { setSource(''); setOffset(0); }}
              className={clsx(
                'px-3 py-1 rounded border',
                !source ? 'bg-orange-600 border-orange-600 text-white' : 'bg-[#222] border-[#333] text-gray-400 hover:text-white'
              )}
            >
              All
            </button>
            {(['dmk_website', 'cmo_tamil_nadu', 'tn_dipr'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setSource(s); setOffset(0); }}
                className={clsx(
                  'px-3 py-1 rounded border',
                  source === s ? 'bg-orange-600 border-orange-600 text-white' : 'bg-[#222] border-[#333] text-gray-400 hover:text-white'
                )}
              >
                {SOURCE_LABEL[s]} ({stats[s].toLocaleString()})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search title or content…"
            value={q}
            onChange={e => { setQ(e.target.value); setOffset(0); }}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
          />
        </div>
        <select
          value={year}
          onChange={e => { setYear(e.target.value); setOffset(0); }}
          className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-sm px-3 py-2 rounded-lg"
        >
          <option value="">All years</option>
          {[2026, 2025, 2024, 2023, 2022, 2021].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {(source || tag || year || q) && (
          <button onClick={reset} className="text-xs text-gray-500 hover:text-white px-3 py-2">
            Clear all
          </button>
        )}
      </div>

      {/* Tag pills */}
      {stats?.top_tags?.length && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {stats.top_tags.slice(0, 12).map(([t, n]) => (
            <button
              key={t}
              onClick={() => { setTag(tag === t ? '' : t); setOffset(0); }}
              className={clsx(
                'text-[11px] px-2 py-0.5 rounded-full border',
                tag === t
                  ? 'bg-blue-900 border-blue-700 text-blue-300'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-white'
              )}
            >
              {t.replace(/_/g, ' ')} ({n})
            </button>
          ))}
        </div>
      )}

      {/* Timeline list */}
      <div className="text-xs text-gray-600 mb-3">
        Showing {items.length} {(source || tag || year || q) ? 'filtered' : 'recent'} items
      </div>

      {loading && <div className="text-gray-600 text-sm">Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <Filter size={28} className="mx-auto mb-2 opacity-30" />
          No items match your filters.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items.map(it => (
          <div
            key={it.id}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#333] transition-colors"
          >
            <div className="flex items-center gap-2 text-[11px] mb-1.5 flex-wrap">
              <span className={clsx('px-2 py-0.5 rounded border', SOURCE_COLOR[it.source] || SOURCE_COLOR.manual)}>
                {SOURCE_LABEL[it.source] || it.source}
              </span>
              <span className="text-gray-600 flex items-center gap-1">
                <Calendar size={10} />
                {new Date(it.announcement_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <h3 className="text-white text-sm font-medium mb-1.5 leading-snug">{it.title}</h3>
            {it.content && it.content !== it.title && (
              <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{it.content}</p>
            )}
            <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
              {it.tags && it.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {it.tags.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-[9px] uppercase text-gray-500 bg-[#222] px-1.5 py-0.5 rounded">
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
              {it.source_url && (
                <a
                  href={it.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 ml-auto"
                >
                  Source <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {items.length >= LIMIT && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            disabled={offset === 0}
            className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white disabled:opacity-30 px-4 py-2 rounded"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-600 self-center px-3">offset {offset + 1}–{offset + items.length}</span>
          <button
            onClick={() => setOffset(offset + LIMIT)}
            disabled={items.length < LIMIT}
            className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white disabled:opacity-30 px-4 py-2 rounded"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
