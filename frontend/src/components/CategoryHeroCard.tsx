'use client';
import Link from 'next/link';
import { Incident } from '@/lib/api';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/constants';
import {
  ExternalLink, MapPin, ShieldCheck, ShieldAlert, ImageOff, Newspaper,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Image-led news-card variant used on the category drill-down pages
 * (/category/[slug]). Different visual emphasis from IncidentCard:
 *
 *   IncidentCard          CategoryHeroCard (this)
 *   ────────────          ─────────────────
 *   Text-led              Image-led (leads with photo/screenshot)
 *   Compact               Tall, breathing room
 *   Dashboard density     Magazine density
 *   All metadata visible  Headline + date + source bylines first
 *
 * Falls back to a clean Newspaper-icon header when no image is available,
 * so the layout stays consistent across mixed-media incidents.
 */
function _outletFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').replace(/^amp\./, '');
    const parts = host.split('.');
    return parts.length >= 2 ? parts[parts.length - 2] : host;
  } catch {
    return 'source';
  }
}

export default function CategoryHeroCard({ incident }: { incident: Incident }) {
  const heroImage = incident.image_urls?.[0];
  const sourceCount = incident.sources?.length ?? incident.source_urls?.length ?? 0;
  const verified =
    incident.verification_status === 'multi_source_verified' ||
    incident.verification_status === 'admin_verified';
  const pressVerified = incident.verification_status === 'press_verified';

  // Pick up to 3 source outlets to surface as bylines under the headline.
  // Prefers structured sources (with outlet labels) when available,
  // falls back to URL-derived outlet names.
  const bylineSources: { url: string; outlet: string }[] =
    (incident.sources?.slice(0, 3).map(s => ({ url: s.url, outlet: s.outlet })))
    ?? (incident.source_urls?.slice(0, 3).map(url => ({ url, outlet: _outletFromUrl(url) })))
    ?? [];

  const categoryColor =
    CATEGORY_COLORS[incident.category] || 'text-gray-300 border-gray-700';

  return (
    <article
      className={clsx(
        'group relative bg-[#141414] border border-[#262626] rounded-xl overflow-hidden',
        'hover:border-orange-700/40 transition-all duration-200 flex flex-col',
        incident.verification_status === 'retracted' && 'opacity-50'
      )}
    >
      {/* Image hero — leads the card. Falls back to a typography header
          when no image is available so the cards stay aligned. */}
      <Link href={`/incidents/${incident.id}`} className="block">
        {heroImage ? (
          <div className="relative aspect-[16/9] bg-[#0a0a0a] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={incident.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              onError={(e) => {
                // Gracefully degrade to fallback if image fails to load
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Gradient overlay so the category chip stays readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {/* Category chip overlaid on image */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span
                className={clsx(
                  'text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md backdrop-blur-sm bg-black/60 border',
                  categoryColor
                )}
              >
                {CATEGORY_LABELS[incident.category] || incident.category.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={clsx(
              'aspect-[16/9] flex items-center justify-center relative',
              'bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d]'
            )}
          >
            <Newspaper size={36} className="text-[#2a2a2a]" />
            <div className="absolute top-3 left-3">
              <span
                className={clsx(
                  'text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md border',
                  categoryColor
                )}
              >
                {CATEGORY_LABELS[incident.category] || incident.category.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        {/* Date · Location · Verification chip — meta row */}
        <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
          <span className="text-gray-400 font-medium">
            {new Date(incident.incident_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {incident.location && (
            <>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-0.5">
                <MapPin size={10} /> {incident.location}
              </span>
            </>
          )}
          <span className="ml-auto">
            {verified ? (
              <span
                className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold"
                title="Cross-verified by 2+ press outlets or admin"
              >
                <ShieldCheck size={10} /> Verified
              </span>
            ) : pressVerified ? (
              <span
                className="flex items-center gap-1 text-sky-400 text-[10px] font-semibold"
                title="Reported by 1 press outlet — credible single source"
              >
                <ShieldCheck size={10} /> Press
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 text-[10px] font-semibold">
                <ShieldAlert size={10} /> Pending
              </span>
            )}
          </span>
        </div>

        {/* Headline — the hero text */}
        <h3 className="text-white font-semibold text-[15px] leading-snug">
          <Link href={`/incidents/${incident.id}`} className="hover:text-orange-300 transition-colors">
            {incident.title}
          </Link>
        </h3>

        {/* Short body */}
        <p className="text-gray-400 text-[12.5px] leading-relaxed line-clamp-3">
          {incident.summary}
        </p>

        {/* Source bylines — newspaper style. Outlet names with external-link
            chips. Stays visible always so the source policy is honoured
            inline on every card. */}
        {bylineSources.length > 0 && (
          <div className="mt-auto pt-3 border-t border-white/5">
            <div className="text-[9.5px] text-gray-600 uppercase tracking-wider mb-1.5">
              Sources · {sourceCount}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {bylineSources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="group/src text-[10.5px] text-gray-400 hover:text-orange-300 px-2 py-0.5 rounded border border-[#2a2a2a] hover:border-orange-600/50 flex items-center gap-1 transition-colors"
                >
                  <span className="font-medium">{s.outlet}</span>
                  <ExternalLink size={8} className="opacity-50 group-hover/src:opacity-100" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
