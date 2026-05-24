'use client';
/**
 * ShareCardModal — generates an Instagram-style 1080×1080 card for any incident
 * and lets the user download it as a PNG or share via the Web Share API.
 *
 * Usage:
 *   <ShareCardModal incident={incident} onClose={() => setOpen(false)} />
 */
import { useRef, useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Share2, Copy, Check, AlertCircle, FileImage } from 'lucide-react';
import { Incident } from '@/lib/api';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/constants';
import clsx from 'clsx';
import CounterNarrativeCard from './CounterNarrativeCard';

const SITE_URL = 'tvkfiles.vercel.app';

// Card-specific category colors (solid, high-contrast for image export)
const CARD_CAT_BG: Record<string, string> = {
  corruption:       'bg-yellow-600',
  murder:           'bg-red-600',
  sexual_assault:   'bg-rose-600',
  child_crime:      'bg-pink-600',
  alcohol_menace:   'bg-orange-700',
  attack_on_press:  'bg-violet-600',
  eb_failure:       'bg-amber-600',
  extortion:        'bg-red-700',
  stickers:         'bg-cyan-700',
  credit_stealing:  'bg-blue-600',
  admin_failure:    'bg-gray-600',
  caste_violence:   'bg-orange-800',
  drugs:            'bg-indigo-600',
  default:          'bg-gray-600',
};

function getCatBg(cat: string) {
  return CARD_CAT_BG[cat] || CARD_CAT_BG.default;
}

function SeverityBar({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={clsx(
            'w-2.5 h-2.5 rounded-sm',
            i < value ? 'bg-red-500' : 'bg-white/10'
          )}
        />
      ))}
    </div>
  );
}

/** The actual card rendered at full 1080px — this div gets rasterized */
function InstaCard({ incident }: { incident: Incident }) {
  const tags = incident.tags && incident.tags.length > 0 ? incident.tags : [incident.category];
  const mainCat = tags[0];
  const catLabel = CATEGORY_LABELS[mainCat] || mainCat.replace(/_/g, ' ');
  const catBg = getCatBg(mainCat);
  const date = new Date(incident.incident_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const sourceCount = incident.source_count || incident.source_urls?.length || 1;
  const isCreditSteal = incident.is_credit_steal;

  return (
    <div
      style={{ width: 1080, height: 1080, fontFamily: 'system-ui, -apple-system, sans-serif' }}
      className="relative flex flex-col bg-[#0d0d0d] overflow-hidden"
    >
      {/* Top accent bar */}
      <div className={clsx('h-2 w-full', catBg)} />

      {/* Header */}
      <div className="flex items-center justify-between px-12 py-8">
        <div>
          <span className="text-white font-black text-4xl tracking-tight">TVK Files</span>
          <div className="text-gray-500 text-xl mt-0.5">{SITE_URL}</div>
        </div>
        <div className={clsx('px-5 py-2 rounded-full text-white font-bold text-xl uppercase tracking-wider', catBg)}>
          {catLabel}
        </div>
      </div>

      {/* Credit-steal banner */}
      {isCreditSteal && (
        <div className="mx-12 mb-4 bg-blue-900/60 border border-blue-600/60 rounded-xl px-7 py-4">
          <div className="text-blue-400 font-black text-lg uppercase tracking-widest mb-1">⚠ Credit Steal Detected</div>
          {incident.original_credit && (
            <div className="text-blue-200 text-2xl leading-snug">{incident.original_credit}</div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col px-12 justify-center">
        <h1 className="text-white font-black text-5xl leading-tight mb-8 max-h-[300px] overflow-hidden">
          {incident.title}
        </h1>
        <p className="text-gray-300 text-2xl leading-relaxed max-h-[220px] overflow-hidden">
          {incident.summary}
        </p>
      </div>

      {/* DMK evidence strip */}
      {isCreditSteal && (incident.dmk_evidence?.length ?? 0) > 0 && (
        <div className="mx-12 mb-6 bg-blue-950/40 rounded-xl px-7 py-4">
          <div className="text-blue-400 font-semibold text-lg mb-1">Originally launched by DMK:</div>
          <div className="text-blue-200 text-xl truncate">
            {incident.dmk_evidence![0].announcement.title}
          </div>
          <div className="text-blue-500 text-lg mt-1">
            {new Date(incident.dmk_evidence![0].announcement.announcement_date)
              .toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-12 py-7 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-8 text-gray-400 text-xl">
          <span>📅 {date}</span>
          {incident.location && <span>📍 {incident.location}</span>}
          <span>🔗 {sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
        </div>
        <SeverityBar value={incident.severity} />
      </div>

      {/* Bottom watermark */}
      <div className={clsx('h-8 w-full flex items-center justify-center', catBg)}>
        <span className="text-white/80 text-base font-semibold tracking-wider">#TVKFiles — {SITE_URL}</span>
      </div>
    </div>
  );
}

interface Props {
  incident: Incident;
  onClose: () => void;
}

type CardVariant = 'incident' | 'counter';

export default function ShareCardModal({ incident, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Credit-steal incidents default to the receipts-card (counter-narrative).
  // Other incidents only get the standard incident card.
  const canShowCounter = !!incident.is_credit_steal;
  const [variant, setVariant] = useState<CardVariant>(canShowCounter ? 'counter' : 'incident');

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 1, // card is already 1080px, no need to scale
      });
      const link = document.createElement('a');
      const suffix = variant === 'counter' ? 'counter-receipts' : 'card';
      link.download = `tvkfiles-${suffix}-${incident.id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Card render error:', err);
    } finally {
      setDownloading(false);
    }
  }, [incident.id, variant]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    if (typeof navigator.share === 'undefined') {
      // Fallback: copy link
      await navigator.clipboard.writeText(`https://${SITE_URL}/incidents/${incident.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 1 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `tvkfiles-${incident.id}.png`, { type: 'image/png' });
      await navigator.share({ files: [file], title: incident.title, text: '#TVKFiles' });
    } catch (_) {
      // user cancelled or not supported — fall through
    }
  }, [incident]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(`https://${SITE_URL}/incidents/${incident.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [incident.id]);

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222]">
          <div>
            <h2 className="text-white font-semibold text-sm">
              {variant === 'counter' ? 'Counter-Narrative Card' : 'Share as Image'}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              {variant === 'counter'
                ? 'TVK claim above, DMK government receipts below — share to bust the narrative'
                : 'Download or share this incident card'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-[#222] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Variant switcher — only when both variants are applicable (credit-steals) */}
        {canShowCounter && (
          <div className="flex gap-1 px-5 pt-3">
            <button
              onClick={() => setVariant('counter')}
              className={clsx(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors',
                variant === 'counter'
                  ? 'bg-yellow-600/20 border border-yellow-600/60 text-yellow-300'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'
              )}
            >
              <AlertCircle size={12} /> Counter-Narrative
            </button>
            <button
              onClick={() => setVariant('incident')}
              className={clsx(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors',
                variant === 'incident'
                  ? 'bg-orange-600/20 border border-orange-600/60 text-orange-300'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'
              )}
            >
              <FileImage size={12} /> Standard Incident
            </button>
          </div>
        )}

        {/* Card preview — scaled down from 1080 to ~480px display */}
        <div className="p-4 flex justify-center bg-[#0a0a0a]">
          <div style={{ width: 480, height: 480, overflow: 'hidden', borderRadius: 8, position: 'relative' }}>
            {/* The real 1080px card — scaled down visually via transform */}
            <div style={{ transform: 'scale(0.4444)', transformOrigin: 'top left', width: 1080, height: 1080 }}>
              <div ref={cardRef}>
                {variant === 'counter' ? (
                  <CounterNarrativeCard incident={incident} />
                ) : (
                  <InstaCard incident={incident} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 p-4 border-t border-[#222]">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Download size={15} />
            {downloading ? 'Rendering…' : 'Download PNG'}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-gray-300 hover:text-white text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            <Share2 size={15} />
            Share
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-gray-300 hover:text-white text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
