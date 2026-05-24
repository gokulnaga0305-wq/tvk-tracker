'use client';
/**
 * Receipts page — the foundational counter-evidence library.
 *
 * Every TVK credit-steal claim has an opposite number here: a structured
 * record of what the DMK government actually launched, with date,
 * beneficiary count, key features, and aliases (so you can search for the
 * scheme by whatever name TVK is rebranding it as).
 *
 * Source data: dmk_schemes table (22 curated entries) + auto-derived
 * categories. The page groups them by category and renders each as a
 * receipt card the user can quickly screenshot or link to.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ScrollText, Search, Filter, Sun, ExternalLink, Heart, GraduationCap,
  Stethoscope, Zap, Bus, Briefcase, Languages, Sprout, Building2,
} from 'lucide-react';
import clsx from 'clsx';
import { useLocale } from '@/components/LocaleProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Scheme {
  id: string;
  name: string;
  aliases: string[];
  launch_date: string;
  description: string | null;
  key_features: string | null;
  beneficiaries_count: string | null;
  evidence_urls: string[];
  derived_category: string;
}

const CATEGORY_META: Record<string, { label: string; ta: string; icon: any; color: string }> = {
  women:       { label: "Women's Welfare",   ta: 'பெண்கள் நலன்',      icon: Heart,         color: 'text-pink-400' },
  education:   { label: 'Education',         ta: 'கல்வி',               icon: GraduationCap, color: 'text-blue-400' },
  health:      { label: 'Health',            ta: 'சுகாதாரம்',           icon: Stethoscope,   color: 'text-emerald-400' },
  welfare:     { label: 'Social Welfare',    ta: 'சமூக நலன்',          icon: Heart,         color: 'text-rose-400' },
  electricity: { label: 'Electricity / EB',  ta: 'மின்சாரம்',           icon: Zap,           color: 'text-yellow-400' },
  transport:   { label: 'Transport',         ta: 'போக்குவரத்து',       icon: Bus,           color: 'text-cyan-400' },
  industry:    { label: 'Industry / Jobs',   ta: 'தொழில் / வேலை',     icon: Briefcase,     color: 'text-orange-400' },
  language:    { label: 'Tamil / Culture',   ta: 'தமிழ் / பண்பாடு',    icon: Languages,     color: 'text-violet-400' },
  agriculture: { label: 'Agriculture',       ta: 'வேளாண்மை',            icon: Sprout,        color: 'text-lime-400' },
  governance:  { label: 'Governance',        ta: 'நிர்வாகம்',            icon: Building2,     color: 'text-gray-400' },
};

export default function ReceiptsPage() {
  const { t, locale } = useLocale();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/dmk-archive/schemes`, { cache: 'no-store' })
      .then(r => r.json())
      .then(setSchemes)
      .catch(() => setSchemes([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by category
  const byCategory: Record<string, Scheme[]> = {};
  for (const s of schemes) {
    (byCategory[s.derived_category] ||= []).push(s);
  }

  // Apply search + category filters
  const filtered = schemes.filter(s => {
    if (activeCat && s.derived_category !== activeCat) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      s.aliases.some(a => a.toLowerCase().includes(q))
    );
  });

  const categories = Object.keys(byCategory).sort((a, b) => byCategory[b].length - byCategory[a].length);
  const totalSchemes = schemes.length;

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScrollText size={22} className="text-yellow-400" />
          {locale === 'ta' ? t('receipts.title') : 'DMK Receipts (2021-2026)'}
        </h1>
        <p className="text-gray-500 text-sm mt-1 max-w-3xl">
          {locale === 'ta'
            ? t('receipts.subtitle')
            : "What the DMK government actually delivered. The reference record for every credit-steal detection — when TVK claims a scheme, you can find the original DMK launch here with date, beneficiary count, and proof."}
        </p>
      </div>

      {/* Stats banner */}
      <div className="bg-gradient-to-r from-yellow-950/60 to-amber-950/30 border border-yellow-700/40 rounded-lg px-4 py-3 mb-6 flex items-center gap-4 flex-wrap">
        <Sun size={18} className="text-yellow-400" />
        <span className="text-yellow-100 font-medium">
          <strong className="text-yellow-300">{loading ? '…' : totalSchemes}</strong> curated DMK schemes
        </span>
        <span className="text-yellow-500/60">·</span>
        <span className="text-yellow-300/80 text-sm">
          Indexed by category. Search by scheme name OR by what TVK is renaming it as (aliases included).
        </span>
      </div>

      {/* Search + category chips */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder={locale === 'ta' ? 'திட்டத்தை தேடுங்கள்…' : 'Search schemes or aliases…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-yellow-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCat(null)}
          className={clsx(
            'text-xs px-3 py-1.5 rounded-full border transition-colors',
            !activeCat
              ? 'bg-yellow-600 border-yellow-600 text-black font-semibold'
              : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:text-white'
          )}
        >
          All ({totalSchemes})
        </button>
        {categories.map(c => {
          const meta = CATEGORY_META[c] || CATEGORY_META.governance;
          const Icon = meta.icon;
          return (
            <button
              key={c}
              onClick={() => setActiveCat(c === activeCat ? null : c)}
              className={clsx(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
                activeCat === c
                  ? 'bg-yellow-600 border-yellow-600 text-black font-semibold'
                  : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:text-white'
              )}
            >
              <Icon size={11} />
              {locale === 'ta' ? meta.ta : meta.label} ({byCategory[c].length})
            </button>
          );
        })}
      </div>

      {/* Scheme cards */}
      {loading ? (
        <div className="text-gray-600 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Filter size={28} className="mx-auto mb-2 opacity-30" />
          <p>No schemes match.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(s => {
            const meta = CATEGORY_META[s.derived_category] || CATEGORY_META.governance;
            const Icon = meta.icon;
            const launchDate = new Date(s.launch_date).toLocaleDateString(locale === 'ta' ? 'ta-IN' : 'en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            });
            return (
              <div
                key={s.id}
                className="bg-gradient-to-br from-[#1a1a1a] to-[#161616] border border-[#2a2a2a] rounded-lg p-4 hover:border-yellow-700/40 transition-all"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className={clsx('shrink-0 w-9 h-9 rounded-md bg-black/40 border border-[#333] flex items-center justify-center', meta.color)}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm leading-snug">{s.name}</h3>
                    <div className="text-yellow-400/80 text-[11px] mt-0.5 flex items-center gap-1.5">
                      <Sun size={9} /> Launched {launchDate}
                    </div>
                  </div>
                </div>

                {s.description && (
                  <p className="text-gray-300 text-xs leading-relaxed mb-2">{s.description}</p>
                )}

                {s.key_features && (
                  <p className="text-gray-500 text-[11px] leading-relaxed italic mb-2">{s.key_features}</p>
                )}

                {s.beneficiaries_count && (
                  <div className="bg-yellow-950/40 border border-yellow-900/40 rounded px-3 py-1.5 mb-2">
                    <div className="text-yellow-400/80 text-[10px] uppercase tracking-wider mb-0.5">Beneficiaries</div>
                    <div className="text-yellow-200 text-xs font-medium">{s.beneficiaries_count}</div>
                  </div>
                )}

                {s.aliases.length > 0 && (
                  <div className="text-[10px] text-gray-600 mt-2">
                    <span className="text-gray-700">Also known as: </span>
                    {s.aliases.slice(0, 4).map((a, i) => (
                      <span key={i} className="text-gray-500">
                        {a}{i < Math.min(s.aliases.length, 4) - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {s.evidence_urls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.evidence_urls.slice(0, 3).map((u, i) => (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-0.5 bg-[#222] px-2 py-0.5 rounded"
                      >
                        Proof {i + 1} <ExternalLink size={8} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CTA — link back to credit-steals */}
      <div className="mt-10 bg-blue-950/30 border border-blue-800/40 rounded-lg px-4 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-blue-200">
          See where TVK is claiming credit for these schemes →
        </div>
        <Link
          href="/credit-steals"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          View Credit Steals
        </Link>
      </div>
    </div>
  );
}
