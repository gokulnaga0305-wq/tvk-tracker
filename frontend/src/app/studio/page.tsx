'use client';
/**
 * Share Studio — one place to turn the dashboard's verified facts into
 * social-ready content. Pick a topic → get a branded, source-stamped 1080×1080
 * image (PNG), a ready-to-post caption, and a link to its NotebookLM briefing
 * pack (for audio/video). Every card carries real, sourced numbers — no AI is
 * used to GENERATE the figures (that would risk fabrication); the image is just
 * a rasterised render of curated, verified copy.
 */
import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Megaphone, Download, Copy, Check, ExternalLink, FileText } from 'lucide-react';
import clsx from 'clsx';

const SITE = 'tvkfiles.vercel.app';

interface Topic {
  key: string;
  label: string;
  badge: string;
  headline: string;
  verdict: string;
  points: string[];
  caption: string;
  sourceLine: string;
  tab: string;            // dashboard tab path
  pack: string;           // outreach pack filename
  accent: string;         // hex
}

const TOPICS: Topic[] = [
  {
    key: 'tasmac', label: 'TASMAC', badge: 'MYTH CHECK', accent: '#e0524f',
    headline: 'Does Tamil Nadu “run on” TASMAC money?',
    verdict: 'MISLEADING — liquor is ~a quarter of own-tax revenue, not the engine.',
    points: [
      '₹48,344 cr is TASMAC’s SALES turnover — not government income.',
      'Real take (VAT + excise) ≈ ₹46,000 cr = ~25% of own-tax, ~11% of the budget, ~1.5% of the economy.',
      'TN is mid-pack — UP, Karnataka & Uttarakhand lean on liquor MORE.',
      'Prohibition states (Bihar, Gujarat) earn ₹0 — and still see hooch deaths.',
    ],
    caption: 'Myth: “TN runs on TASMAC.” Reality: that ₹48,344 cr is SALES turnover, not govt income. The state’s real liquor take is ~a quarter of own-tax revenue — ~11% of the budget, ~1.5% of the economy. TN is mid-pack; UP & Karnataka lean on liquor more.\n\nFull breakdown + sources 👇\nhttps://tvkfiles.vercel.app/tasmac\n#TASMAC #TamilNadu #FactCheck',
    sourceLine: 'Sources: PRS · RBI State Finances · The Federal · CAG',
    tab: '/tasmac', pack: 'tasmac-truth-briefing.md',
  },
  {
    key: 'power', label: 'Power / EB', badge: 'FACT CHECK', accent: '#d99a3a',
    headline: 'Did DMK hike your EB bill “every year”?',
    verdict: 'OVERSTATED — the yearly rise is an inflation-linked TNERC true-up; households are shielded.',
    points: [
      'First hike in 8 years came in Sept 2022 (₹3 → ₹4.50/unit) — tariffs were frozen since 2014.',
      '2023/24/25 hikes (2.18%, 4.83%, 3.16%) are AUTOMATIC CPI-linked, set by TNERC — not a yearly DMK choice.',
      '100 free units + free power for huts retained; domestic/MSME/agri shielded by subsidy.',
      'The same mechanism now runs under TVK — the July-2026 hike fires under the DMK-era 2022 order.',
    ],
    caption: '“DMK hikes your EB bill every year” — overstated. The yearly rise is an inflation-linked TNERC true-up (not a DMK decision), correcting an 8-year freeze, and domestic users are shielded by subsidy. The same mechanism now runs under TVK.\n\nFull timeline + sources 👇\nhttps://tvkfiles.vercel.app/power\n#EBbill #TamilNadu #TNERC',
    sourceLine: 'Sources: TNERC Order 7/2022 · Mercom · DT Next · The South First',
    tab: '/power', pack: 'power-eb-briefing.md',
  },
  {
    key: 'creditsteal', label: 'Adani smart-meter', badge: 'DEBUNKED', accent: '#5a7fd0',
    headline: 'Did CM Vijay “reject” the ₹20,000 cr Adani smart-meter deal?',
    verdict: 'FALSE — the DMK government cancelled the Adani tender on 27 Dec 2024.',
    points: [
      'Adani Energy Solutions’ tender was scrapped by the DMK/Stalin govt (Dec 2024) — price too high.',
      'TVK’s June-2026 move shelved a SEPARATE, re-tendered project — no Adani vendor involved.',
      'BJP criticised it as risking ~₹5,000 cr in central RDSS grants.',
      'The viral card welds DMK’s 2024 Adani cancellation onto TVK’s 2026 shelving.',
    ],
    caption: 'Viral card: “Vijay rejects ₹20,000 cr Adani smart-meter project.” FALSE — the Adani tender was cancelled by the DMK govt on 27 Dec 2024 (price too high). TVK only shelved a separate, vendor-less re-tender in 2026.\n\nReceipts 👇\nhttps://tvkfiles.vercel.app/credit-steals\n#FactCheck #TamilNadu',
    sourceLine: 'Sources: Business Today · Deccan Herald · DT Next',
    tab: '/credit-steals', pack: 'credit-steals-briefing.md',
  },
  {
    key: 'whitepaper', label: 'White Paper', badge: 'FACT CHECK', accent: '#d99a3a',
    headline: 'TVK white paper: did DMK “empty the treasury”?',
    verdict: 'MISLEADING — debt doubled, but so did the economy; the ratio actually fell.',
    points: [
      'AIADMK left ~₹5 lakh cr debt on ₹17 lakh cr GSDP = 29%. DMK: ~₹10 lakh cr on ₹36 lakh cr = 28%.',
      'Debt-to-GSDP is ~26% (PRS) and within the ~30% limit — better than Punjab (46%), WB (37%), Kerala (36%).',
      'Real concerns conceded: interest ~22% of revenue, a revenue deficit. But the deficits are at the FRBM target, not “record”.',
      'Much debt was inherited (AIADMK 2016-17, UDAY 2017, COVID 2020-21). “Emptied the treasury” has no audited basis.',
    ],
    caption: 'TVK’s white paper says DMK “emptied the treasury.” Reality: debt doubled (₹5L→₹10L cr) — but the economy doubled too (₹17L→₹36L cr), so debt-to-GSDP actually FELL (29%→28%) and stays within the ~30% limit — better than Punjab/WB/Kerala. Real concerns exist (interest burden), but “emptied the treasury” ignores inherited debt.\n\nFull fact-check 👇\nhttps://tvkfiles.vercel.app/white-paper\n#TamilNadu #WhitePaper #FactCheck',
    sourceLine: 'Sources: PRS · 16th Finance Commission (CAG) · RBI · ThePrint, The Federal (16 Jun 2026)',
    tab: '/white-paper', pack: 'white-paper-briefing.md',
  },
  {
    key: 'investments', label: 'Investments', badge: 'READ THE FINE PRINT', accent: '#1d9e75',
    headline: '₹3 lakh crore “invested” in Tamil Nadu?',
    verdict: 'MoU ≠ money delivered — only ~9% is operational on the ground.',
    points: [
      'Flagship MoUs total ~₹2.98 lakh cr (a subset of GIM 2024’s ₹6.64 lakh cr).',
      'Only ~₹27,000 cr (~9%) is OPERATIONAL; most is signed MoUs not yet built.',
      'Every commitment is source-linked; Mazagon Dock is at-risk (drifting to Andhra).',
      'An MoU is a commitment — not delivered money. Watch the ground delivery.',
    ],
    caption: 'Tamil Nadu’s investment scorecard: ~₹2.98 lakh cr in flagship MoUs — but only ~9% (~₹27k cr) is actually operational on the ground. An MoU is a commitment, not delivered money. Every figure is source-linked.\n\n👇\nhttps://tvkfiles.vercel.app/investments\n#TamilNadu #Investments',
    sourceLine: 'Sources: company releases · PRS · GIM 2024 official list',
    tab: '/investments', pack: 'investments-briefing.md',
  },
];

/** The 1080×1080 card that gets rasterised. */
function StudioCard({ t }: { t: Topic }) {
  return (
    <div style={{ width: 1080, height: 1080, fontFamily: 'system-ui, -apple-system, sans-serif' }}
         className="relative flex flex-col bg-[#0d0d0d] overflow-hidden">
      <div style={{ height: 10, background: t.accent }} />
      <div className="flex items-center justify-between px-12 pt-8 pb-4">
        <div>
          <span className="text-white font-black text-4xl tracking-tight">TVK Files</span>
          <div className="text-gray-500 text-xl mt-0.5">{SITE}</div>
        </div>
        <div className="px-5 py-2 rounded-full text-white font-bold text-xl uppercase tracking-wider" style={{ background: t.accent }}>
          {t.badge}
        </div>
      </div>
      <div className="px-12 pt-2">
        <h1 className="text-white font-black text-[52px] leading-[1.1] mb-5">{t.headline}</h1>
        <div className="inline-block rounded-xl px-6 py-4 mb-7" style={{ background: t.accent + '22', border: `2px solid ${t.accent}55` }}>
          <span className="text-2xl font-bold" style={{ color: t.accent }}>{t.verdict}</span>
        </div>
      </div>
      <div className="flex-1 px-12 flex flex-col justify-start gap-5">
        {t.points.map((p, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="mt-2 shrink-0 rounded-full" style={{ width: 14, height: 14, background: t.accent }} />
            <span className="text-gray-200 text-[28px] leading-snug">{p}</span>
          </div>
        ))}
      </div>
      <div className="px-12 py-5">
        <div className="text-gray-500 text-lg">{t.sourceLine}</div>
      </div>
      <div className="h-12 w-full flex items-center justify-center" style={{ background: t.accent }}>
        <span className="text-white/90 text-xl font-semibold tracking-wider">#TVKFiles — {SITE}{t.tab}</span>
      </div>
    </div>
  );
}

export default function StudioPage() {
  const [active, setActive] = useState<Topic>(TOPICS[0]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const download = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 1 });
      const link = document.createElement('a');
      link.download = `tvkfiles-${active.key}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) { console.error('render failed', e); }
    finally { setDownloading(false); }
  }, [active]);

  const copyCaption = useCallback(async () => {
    await navigator.clipboard.writeText(active.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [active]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone size={20} className="text-rose-400" />
        <h1 className="text-xl font-bold text-white">Share Studio</h1>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        Turn the dashboard’s verified facts into social posts. Pick a topic → download a branded, sourced
        image, copy a ready caption, and grab its NotebookLM pack for audio/video. Every figure is real and cited.
      </p>

      {/* Topic picker */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TOPICS.map(t => (
          <button key={t.key} onClick={() => setActive(t)}
            className={clsx('text-sm px-3.5 py-1.5 rounded-full border transition-colors',
              active.key === t.key ? 'text-white font-semibold' : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white')}
            style={active.key === t.key ? { background: t.accent + '22', borderColor: t.accent + '88' } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Card preview (scaled 1080 → 480) */}
        <div>
          <div className="rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#0a0a0a] p-3 inline-block">
            <div style={{ width: 480, height: 480, overflow: 'hidden', position: 'relative' }}>
              <div style={{ transform: 'scale(0.4444)', transformOrigin: 'top left', width: 1080, height: 1080 }}>
                <div ref={cardRef}><StudioCard t={active} /></div>
              </div>
            </div>
          </div>
          <button onClick={download} disabled={downloading}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
            <Download size={15} /> {downloading ? 'Rendering…' : 'Download image (1080×1080 PNG)'}
          </button>
        </div>

        {/* Caption + assets */}
        <div className="space-y-3">
          <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-gray-500">Ready-to-post caption</span>
              <button onClick={copyCaption} className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300">
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">{active.caption}</pre>
          </div>

          <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">More formats</div>
            <div className="flex flex-col gap-2 text-sm">
              <a href={`https://github.com/gokulnaga0305-wq/tvk-tracker/blob/main/outreach/${active.pack}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-white">
                <FileText size={14} className="text-rose-400" /> NotebookLM pack — for audio / video / FAQ
                <ExternalLink size={11} className="text-gray-600" />
              </a>
              <a href={active.tab} className="flex items-center gap-2 text-gray-300 hover:text-white">
                <ExternalLink size={14} className="text-gray-500" /> Open the source tab ({active.tab})
              </a>
            </div>
            <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
              For an explainer video or audio: open NotebookLM, upload the pack above, and generate.
              Keep numbers out of any AI-generated image — use this sourced card for the data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
