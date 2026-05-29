'use client';
import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { Incident } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/constants';
import CategoryHeroCard from '@/components/CategoryHeroCard';
import {
  ArrowLeft, Newspaper, Filter, ShieldCheck, ShieldAlert,
  AlertTriangle, Image as ImageIcon, Calendar, ArrowDownAZ,
} from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Category drill-down page.
 *
 * Lands the user on an image-led news feed for a single category when
 * they click any dashboard widget (StatCard, BaselineDelta card). The
 * goal is to make the path from "12 corruption cases" to "show me the
 * actual press articles behind those 12" one click.
 *
 * Special-case slugs:
 *   - "power_eb"        merges power_cut + eb_failure (matches the merged
 *                       widget on the dashboard)
 *   - "credit_stealing" filters by is_credit_steal=true rather than
 *                       category, since credit-steal is a flag not a
 *                       category in our schema
 */

type TrustFilter = 'all' | 'verified' | 'press';
type SortMode = 'recent' | 'severity';

// Map widget slug -> { backendCategory(s), display label }
const SLUG_CONFIG: Record<string, { categories?: string[]; isCreditSteal?: boolean; label: string; description: string }> = {
  power_eb:        { categories: ['power_cut', 'eb_failure'],     label: 'Power & EB',           description: 'Power cuts, EB failures, transformer issues, billing disputes' },
  credit_stealing: { isCreditSteal: true,                          label: 'Credit Stealing',      description: 'TVK announcing or claiming credit for DMK-era schemes' },
  power_cut:       { categories: ['power_cut'],                    label: 'Power Cuts',           description: 'Reported electricity outages across TN' },
  eb_failure:      { categories: ['eb_failure'],                   label: 'EB / TANGEDCO',        description: 'Transformer failures, billing fraud, employee misconduct' },
};

function fallbackConfig(slug: string) {
  return {
    categories: [slug],
    label: CATEGORY_LABELS[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: `All reported incidents under the ${CATEGORY_LABELS[slug] || slug} category`,
  };
}

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  // Next.js 15: params is a Promise that must be unwrapped via React.use().
  const { slug } = usePromise(params);
  const config = SLUG_CONFIG[slug] || fallbackConfig(slug);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trustFilter, setTrustFilter] = useState<TrustFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [imageOnly, setImageOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    setLoading(true);

    // Fetch logic:
    //   - If isCreditSteal: hit /api/incidents/?is_credit_steal=true&limit=100
    //   - Else: fetch each category and merge
    async function loadAll() {
      try {
        let combined: Incident[] = [];
        if (config.isCreditSteal) {
          const r = await fetch(`${API}/api/incidents/?is_credit_steal=true&limit=100`, { signal: ctrl.signal, cache: 'no-store' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data: Incident[] = await r.json();
          combined = Array.isArray(data) ? data : [];
        } else {
          const lists = await Promise.all(
            (config.categories || [slug]).map(async cat => {
              const r = await fetch(`${API}/api/incidents/?category=${encodeURIComponent(cat)}&limit=100`, { signal: ctrl.signal, cache: 'no-store' });
              if (!r.ok) return [] as Incident[];
              const data = await r.json();
              return Array.isArray(data) ? data : [];
            })
          );
          // Dedupe by id when combining multiple categories
          const seen = new Set<string>();
          for (const list of lists) {
            for (const inc of list) {
              if (!seen.has(inc.id)) {
                seen.add(inc.id);
                combined.push(inc);
              }
            }
          }
        }
        if (!cancelled) setIncidents(combined);
      } catch (e: any) {
        if (e?.name !== 'AbortError' && !cancelled) {
          setError(String(e?.message || e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();

    return () => { cancelled = true; ctrl.abort(); };
  }, [slug]);

  // Apply trust filter + image-only filter + sort
  const filtered = incidents
    .filter(i => {
      if (trustFilter === 'verified') {
        return ['multi_source_verified', 'admin_verified'].includes(i.verification_status || '');
      }
      if (trustFilter === 'press') {
        return ['multi_source_verified', 'admin_verified', 'press_verified'].includes(i.verification_status || '');
      }
      return true;
    })
    .filter(i => !imageOnly || (i.image_urls && i.image_urls.length > 0))
    .sort((a, b) => {
      if (sortMode === 'severity') {
        if (b.severity !== a.severity) return b.severity - a.severity;
      }
      return new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime();
    });

  const verifiedCount = incidents.filter(i =>
    ['multi_source_verified', 'admin_verified'].includes(i.verification_status || '')
  ).length;
  const pressCount = incidents.filter(i => i.verification_status === 'press_verified').length;
  const pendingCount = incidents.length - verifiedCount - pressCount;
  const withImageCount = incidents.filter(i => i.image_urls && i.image_urls.length > 0).length;

  return (
    <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Back to dashboard */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-400 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      {/* Hero header — category name + count + DMK baseline link */}
      <header className="mb-6 border-b border-[#1f1f1f] pb-5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {config.label}
          </h1>
          <span className="text-orange-400 text-xl font-semibold">
            {incidents.length}
          </span>
          <span className="text-gray-600 text-sm">incident{incidents.length === 1 ? '' : 's'} since May 11, 2026</span>
        </div>
        <p className="text-gray-500 text-sm mt-2 max-w-2xl">{config.description}</p>

        {/* Trust split for this category */}
        {incidents.length > 0 && (
          <div className="flex items-center gap-4 mt-3 text-[12px] flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck size={12} /> {verifiedCount} cross-verified
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <ShieldCheck size={12} /> {pressCount} press-confirmed
            </span>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <ShieldAlert size={12} /> {pendingCount} community
              </span>
            )}
            <span className="text-gray-600">·</span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <ImageIcon size={12} /> {withImageCount} with image
            </span>
          </div>
        )}
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Trust filter — tri-state */}
        <div className="inline-flex rounded-lg border border-[#262626] overflow-hidden text-xs">
          {([
            { k: 'all',      label: 'All', icon: Filter },
            { k: 'press',    label: 'Press+', icon: Newspaper },
            { k: 'verified', label: 'Cross-verified', icon: ShieldCheck },
          ] as const).map((opt, i, arr) => (
            <button
              key={opt.k}
              onClick={() => setTrustFilter(opt.k)}
              className={clsx(
                'px-3 py-1.5 flex items-center gap-1.5 transition-colors',
                i > 0 && 'border-l border-[#262626]',
                trustFilter === opt.k
                  ? 'bg-orange-600/20 text-orange-300'
                  : 'bg-[#161616] text-gray-500 hover:text-gray-300'
              )}
            >
              <opt.icon size={11} />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="inline-flex rounded-lg border border-[#262626] overflow-hidden text-xs">
          {([
            { k: 'recent',   label: 'Latest first', icon: Calendar },
            { k: 'severity', label: 'Severity',     icon: ArrowDownAZ },
          ] as const).map((opt, i) => (
            <button
              key={opt.k}
              onClick={() => setSortMode(opt.k)}
              className={clsx(
                'px-3 py-1.5 flex items-center gap-1.5 transition-colors',
                i > 0 && 'border-l border-[#262626]',
                sortMode === opt.k
                  ? 'bg-orange-600/20 text-orange-300'
                  : 'bg-[#161616] text-gray-500 hover:text-gray-300'
              )}
            >
              <opt.icon size={11} />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Image-only toggle */}
        <button
          onClick={() => setImageOnly(v => !v)}
          className={clsx(
            'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
            imageOnly
              ? 'bg-orange-600/20 text-orange-300 border-orange-600/50'
              : 'bg-[#161616] text-gray-500 border-[#262626] hover:text-gray-300'
          )}
        >
          <ImageIcon size={11} /> With image only
        </button>

        <span className="ml-auto text-gray-600 text-xs">
          Showing {filtered.length} of {incidents.length}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[16/9] bg-[#1a1a1a]" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-[#1a1a1a] rounded w-1/3" />
                <div className="h-4 bg-[#1a1a1a] rounded w-full" />
                <div className="h-3 bg-[#1a1a1a] rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-6 text-red-300 text-sm">
          Failed to load: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {incidents.length === 0
              ? `No incidents tracked under ${config.label} yet.`
              : `No incidents match the current filters.`}
          </p>
          {incidents.length > 0 && filtered.length === 0 && (
            <button
              onClick={() => { setTrustFilter('all'); setImageOnly(false); }}
              className="mt-3 text-xs text-orange-400 hover:text-orange-300"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(inc => (
            <CategoryHeroCard key={inc.id} incident={inc} />
          ))}
        </div>
      )}
    </main>
  );
}
