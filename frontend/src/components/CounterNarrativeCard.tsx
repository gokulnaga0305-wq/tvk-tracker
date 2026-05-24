'use client';
/**
 * CounterNarrativeCard — purpose-built shareable for credit-steal incidents.
 *
 * Visual hierarchy: TOP half shows TVK's claim (red, the lie), BOTTOM half
 * shows DMK's documented original (rising-sun palette, the receipt).
 *
 * Designed for one-tap sharing on WhatsApp/Twitter. Image must read on a
 * phone-size thumbnail BEFORE the recipient even opens the message.
 *
 * Uses real data from incident.dmk_evidence[0] when available — that's the
 * top-scoring archive match from incident_dmk_evidence (linked to one of the
 * 3,085 DMK-era announcements in dmk_announcements).
 */
import { Incident, DmkPrecedent } from '@/lib/api';

const SITE_URL = 'tvkfiles.vercel.app';

const SOURCE_LABEL: Record<string, string> = {
  dmk_website:    'dmk.in',
  cmo_tamil_nadu: '@CMOTamilnadu',
  tn_dipr:        '@TNDIPRNEWS',
  manual:         'DMK Records',
};

interface Props {
  incident: Incident;
}

/**
 * The 1080×1080 card. Render this inside a div ref so html-to-image can
 * rasterize. Used inside ShareCardModal — never directly.
 */
export default function CounterNarrativeCard({ incident }: Props) {
  const tvkDate = new Date(incident.incident_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const evidence: DmkPrecedent | undefined = incident.dmk_evidence?.[0];
  const schemeName = incident.related_dmk_scheme || evidence?.announcement?.title || 'DMK-era scheme';
  const dmkDateLabel = evidence
    ? new Date(evidence.announcement.announcement_date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;
  const dmkSource = evidence?.announcement?.source;
  const dmkSourceLabel = dmkSource ? (SOURCE_LABEL[dmkSource] || dmkSource) : null;
  const evidenceCount = incident.dmk_evidence?.length || 0;

  return (
    <div
      style={{ width: 1080, height: 1080, fontFamily: 'system-ui, -apple-system, sans-serif' }}
      className="relative flex flex-col bg-[#0d0d0d] overflow-hidden"
    >
      {/* Top warning strip */}
      <div className="h-14 bg-yellow-500 flex items-center justify-center px-8">
        <span className="text-black font-black text-2xl tracking-widest uppercase">
          ⚠ Credit Steal — Verified Against DMK Archive
        </span>
      </div>

      {/* === TVK CLAIM (top half) === */}
      <div className="flex-1 px-12 py-8 bg-gradient-to-br from-[#2a0a0a] to-[#1a0506] border-b-4 border-yellow-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-400 font-bold text-lg uppercase tracking-widest">
            TVK Claim · {tvkDate}
          </span>
        </div>
        <h2 className="text-white font-black text-4xl leading-tight mb-4 max-h-[180px] overflow-hidden">
          {incident.title}
        </h2>
        <p className="text-red-100/90 text-xl leading-relaxed max-h-[140px] overflow-hidden">
          {incident.summary}
        </p>
      </div>

      {/* === DMK RECEIPTS (bottom half) === */}
      <div className="flex-1 px-12 py-8 bg-gradient-to-br from-[#0a0e1e] via-[#0e1228] to-[#1a1530] relative">
        {/* Rising-sun accent in corner — abstract DMK reference */}
        <div className="absolute top-6 right-12 flex items-center gap-2">
          <span className="text-yellow-400 text-3xl">☀</span>
          <span className="text-yellow-300/80 font-bold text-base uppercase tracking-widest">
            DMK Government Record
          </span>
        </div>

        <div className="flex items-center gap-3 mb-3 pt-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-yellow-300 font-bold text-lg uppercase tracking-widest">
            Originally Launched: {dmkDateLabel || 'DMK era (2021–2026)'}
          </span>
        </div>

        <h3 className="text-yellow-100 font-black text-3xl leading-tight mb-3 max-h-[120px] overflow-hidden">
          {schemeName}
        </h3>

        {incident.original_credit && (
          <p className="text-blue-100/85 text-lg leading-relaxed mb-3 max-h-[80px] overflow-hidden italic">
            “{incident.original_credit}”
          </p>
        )}

        {evidence && (
          <div className="bg-black/40 border-l-4 border-yellow-500 px-5 py-3 rounded-r-md">
            <div className="text-yellow-300/90 text-sm uppercase tracking-wider mb-1 font-bold">
              Receipt:
            </div>
            <div className="text-white text-lg leading-snug">
              {evidence.announcement.title.slice(0, 120)}
            </div>
            <div className="text-yellow-400/80 text-sm mt-1">
              Source: {dmkSourceLabel} · Archive match: {Math.round((evidence.match_score || 0) * 100)}%
              {evidenceCount > 1 && <span> · +{evidenceCount - 1} more proof{evidenceCount > 2 ? 's' : ''}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Bottom strip — Don't be fooled */}
      <div className="h-20 bg-black flex items-center justify-between px-12 border-t-2 border-yellow-500">
        <div>
          <div className="text-white font-black text-2xl">Don't be fooled.</div>
          <div className="text-yellow-300 text-base">This was DMK government's work.</div>
        </div>
        <div className="text-right">
          <div className="text-white font-bold text-xl">#TVKFiles</div>
          <div className="text-gray-400 text-sm">{SITE_URL}</div>
        </div>
      </div>
    </div>
  );
}
