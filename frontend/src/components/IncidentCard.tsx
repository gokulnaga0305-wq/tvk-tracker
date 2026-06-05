'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Incident } from '@/lib/api';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/constants';
import { ExternalLink, MapPin, Copy, AlertCircle, ShieldCheck, ShieldAlert, ShieldX, Share2 } from 'lucide-react';
import clsx from 'clsx';
import ShareCardModal from './ShareCardModal';

const TIER_LABEL: Record<string, string> = {
  primary: 'Govt source',
  established_press: 'Established press',
  regional_press: 'Regional press',
  online_native: 'Online native',
  social_media: 'Social media',
  anonymous_social: 'Anonymous',
  spark_plus: 'Spark+',
  unknown: 'Unknown',
};

const TIER_COLOR: Record<string, string> = {
  primary: 'text-green-400',
  established_press: 'text-blue-400',
  regional_press: 'text-cyan-400',
  online_native: 'text-violet-400',
  social_media: 'text-pink-400',
  anonymous_social: 'text-gray-500',
  spark_plus: 'text-orange-400',
  unknown: 'text-gray-500',
};

function VerificationBadge({ incident }: { incident: Incident }) {
  const status = incident.verification_status;
  if (status === 'retracted') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-red-700 text-red-400 uppercase">
        <ShieldX size={10} /> Retracted
      </span>
    );
  }
  if (status === 'admin_verified') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-emerald-600 text-emerald-400 uppercase">
        <ShieldCheck size={10} /> Admin verified
      </span>
    );
  }
  if (status === 'multi_source_verified') {
    const count = incident.source_count || incident.source_urls?.length || 0;
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-green-600 text-green-400 uppercase">
        <ShieldCheck size={10} /> Verified · {count} sources
      </span>
    );
  }
  if (status === 'single_source') {
    // Auto-published after the 24h/48h recheck window with no press echo.
    // Counts in the dashboard total, but flagged so readers know it's
    // reported-but-not-cross-verified.
    return (
      <span
        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-amber-600 text-amber-400 uppercase"
        title="Auto-published after 48h with no press corroboration found. Reported, not cross-verified."
      >
        <ShieldAlert size={10} /> Single-source verification
      </span>
    );
  }
  if (status === 'pending_verification') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-yellow-700 text-yellow-400 uppercase">
        <ShieldAlert size={10} /> Single source
      </span>
    );
  }
  return null;
}

function SourcesList({ incident }: { incident: Incident }) {
  const sources = incident.sources || [];
  if (sources.length === 0 && (incident.source_urls?.length ?? 0) === 0) return null;

  return (
    <div className="border-t border-[#222] mt-3 pt-2.5">
      <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <ShieldCheck size={9} /> Sources ({sources.length || incident.source_urls.length})
      </div>
      <div className="flex flex-col gap-1">
        {(sources.length ? sources : incident.source_urls.map(url => ({ url, outlet: 'unknown', credibility_tier: 'unknown' }))).map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors group"
          >
            <span className={clsx('shrink-0 text-[10px] font-medium', TIER_COLOR[s.credibility_tier] || 'text-gray-500')}>
              {s.outlet}
            </span>
            <span className="text-gray-700">·</span>
            <span className="text-[10px] text-gray-600">{TIER_LABEL[s.credibility_tier] || s.credibility_tier}</span>
            <ExternalLink size={9} className="text-gray-700 group-hover:text-orange-400 ml-auto" />
          </a>
        ))}
      </div>
    </div>
  );
}

function DmkEvidence({ incident }: { incident: Incident }) {
  const evidence = incident.dmk_evidence || [];
  if (evidence.length === 0) return null;

  return (
    <div className="border border-blue-900/40 bg-blue-950/30 rounded-md mt-3 px-3 py-2.5">
      <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1 font-medium">
        <Copy size={9} /> Originally launched by DMK · {evidence.length} precedent{evidence.length > 1 ? 's' : ''}
      </div>
      <div className="flex flex-col gap-2">
        {evidence.slice(0, 3).map((ev, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="text-blue-400 shrink-0 mt-0.5 text-[10px] font-bold">
              {Math.round(ev.match_score * 100)}%
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-blue-200 font-medium truncate">
                {ev.announcement.title}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-blue-500">
                <span>{ev.announcement.source.replace(/_/g, ' ')}</span>
                <span>·</span>
                <span>{new Date(ev.announcement.announcement_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                {ev.announcement.source_url && (
                  <a
                    href={ev.announcement.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                  >
                    Source <ExternalLink size={8} />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IncidentCard({ incident }: { incident: Incident }) {
  const categoryColor = CATEGORY_COLORS[incident.category] || 'text-gray-400 border-gray-400';
  const severityDots = Array.from({ length: 5 }, (_, i) => i < incident.severity);
  const isRetracted = incident.verification_status === 'retracted';
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
    {shareOpen && <ShareCardModal incident={incident} onClose={() => setShareOpen(false)} />}
    <div
      className={clsx(
        'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#3a3a3a] transition-all',
        incident.is_credit_steal && !isRetracted && 'border-l-4 border-l-blue-500',
        isRetracted && 'opacity-50'
      )}
    >
      {/* Top row: tags + verification + severity */}
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Render every tag (multi-category) */}
          {(incident.tags && incident.tags.length > 0 ? incident.tags : [incident.category]).map((t, i) => {
            const color = CATEGORY_COLORS[t] || 'text-gray-400 border-gray-400';
            return (
              <span
                key={i}
                className={clsx(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider',
                  color
                )}
              >
                {CATEGORY_LABELS[t] || t.replace(/_/g, ' ')}
              </span>
            );
          })}
          {incident.is_credit_steal && (!incident.tags?.includes('credit_stealing')) && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-500 text-blue-400 uppercase">
              <Copy size={9} /> Credit Steal
            </span>
          )}
          {incident.flair && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#222] text-gray-300 italic">
              {incident.flair}
            </span>
          )}
          <VerificationBadge incident={incident} />
        </div>
        <div className="flex gap-0.5 shrink-0">
          {severityDots.map((filled, i) => (
            <div
              key={i}
              className={clsx('w-2 h-2 rounded-full', filled ? 'bg-red-500' : 'bg-[#333]')}
            />
          ))}
        </div>
      </div>

      {/* Title + summary */}
      <h3 className={clsx('text-white font-semibold text-sm mb-1.5 leading-snug', isRetracted && 'line-through')}>
        <Link href={`/incidents/${incident.id}`} className="hover:text-orange-300 transition-colors">
          {incident.title}
        </Link>
      </h3>
      <p className="text-gray-400 text-xs leading-relaxed mb-3">{incident.summary}</p>

      {/* Retraction notice */}
      {isRetracted && incident.retraction_reason && (
        <div className="bg-red-950/40 border border-red-800/40 rounded px-3 py-2 mb-3 text-xs text-red-300">
          <span className="font-medium">Retracted: </span>{incident.retraction_reason}
        </div>
      )}

      {/* Credit-steal original-credit text */}
      {incident.is_credit_steal && incident.original_credit && !isRetracted && (
        <div className="bg-blue-950/40 border border-blue-800/40 rounded px-3 py-2 mb-3 text-xs text-blue-300">
          <AlertCircle size={11} className="inline mr-1" />
          <span className="font-medium">Original credit: </span>
          {incident.original_credit}
        </div>
      )}

      {/* DMK archive precedent evidence */}
      {!isRetracted && <DmkEvidence incident={incident} />}

      {/* Sources list */}
      {!isRetracted && <SourcesList incident={incident} />}

      {/* Footer meta */}
      <div className="flex items-center justify-between text-[11px] text-gray-600 mt-3 pt-2 border-t border-[#222]">
        <div className="flex items-center gap-3 flex-wrap">
          <span>
            {new Date(incident.incident_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {incident.location && (
            <span className="flex items-center gap-1">
              <MapPin size={10} /> {incident.location}
            </span>
          )}
          <span className="text-gray-700">AI conf: {Math.round(incident.ai_confidence * 100)}%</span>
        </div>
        {/* Share button */}
        {!isRetracted && (
          <button
            onClick={() => setShareOpen(true)}
            title="Share as image"
            className="flex items-center gap-1 text-gray-600 hover:text-orange-400 transition-colors px-1.5 py-1 rounded hover:bg-[#222]"
          >
            <Share2 size={12} />
            <span className="text-[10px]">Share</span>
          </button>
        )}
      </div>
    </div>
    </>
  );
}
