'use client';
/**
 * "Why the Dravidian Model" explainer — the analytical backbone for the
 * Receipts page. Reframes the DMK scheme record (Pudhumai Penn, free bus
 * travel, breakfast scheme, etc.) NOT as "freebies" but as the
 * opportunity-redistribution mechanism that academic work (Kalaiyarasan &
 * Vijayabaskar, CUP 2021) identifies as the engine of TN's inclusive growth.
 *
 * Static, sourced content (open-access essays only — the book itself is not
 * reproduced). Collapsible so it doesn't crowd the receipt cards.
 *
 * Honest-framing rule: the authors' own acknowledged caveats are shown too,
 * so the card reads as analysis, not propaganda.
 */
import { useState } from 'react';
import {
  BookOpen, ChevronDown, GraduationCap, Building2, Zap, TrendingDown,
  Users, ExternalLink, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';

interface Achievement { icon: any; text: string }

const ACHIEVEMENTS: Achievement[] = [
  { icon: Building2,     text: 'Highest urbanisation rate of any Indian state — and inclusive: lower castes brought into the modern urban economy.' },
  { icon: Users,        text: 'One-fourth of ALL Dalit-owned enterprises in India are in Tamil Nadu.' },
  { icon: GraduationCap, text: 'Highest gross enrolment in higher education — overall AND for Scheduled Castes specifically.' },
  { icon: TrendingDown, text: 'Among the highest poverty-reduction rates in the country.' },
  { icon: Zap,          text: 'Highest share of renewable energy among states.' },
];

const CAVEATS = [
  'Rising urban inequality and a widening rural–urban divide.',
  'Creeping privatisation of education and healthcare.',
  'High corruption and very high election-spending rates.',
  'Ongoing caste-atrocity violence — the model is incomplete, not finished.',
];

const SOURCES = [
  { label: 'The India Forum (authors’ own essay)', url: 'https://www.theindiaforum.in/article/model-social-and-economic-change-tamil-nadu' },
  { label: 'EPW review', url: 'https://www.epw.in/journal/2022/8/book-reviews/inclusivity-and-growth-under-%E2%80%98dravidian-model%E2%80%99.html' },
  { label: 'Urban Studies 2025', url: 'https://journals.sagepub.com/doi/10.1177/00420980251317917' },
];

export default function DravidianModelExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-6 rounded-lg border border-violet-800/40 bg-gradient-to-br from-violet-950/30 to-[#161616] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-violet-950/20 transition-colors"
      >
        <BookOpen size={18} className="text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm">
            Why these aren&rsquo;t &ldquo;freebies&rdquo; — the Dravidian Model
          </div>
          <div className="text-violet-300/70 text-[11px] mt-0.5">
            The peer-reviewed framing: welfare as the engine of inclusive growth, not a drain on it.
          </div>
        </div>
        <ChevronDown
          size={18}
          className={clsx('text-violet-400 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-violet-900/30">
          {/* Thesis */}
          <p className="text-gray-300 text-[13px] leading-relaxed mt-3 mb-3">
            Tamil Nadu is the <strong className="text-violet-300">only major Indian state to
            combine high growth WITH social inclusion</strong> — disproving the
            &ldquo;growth-vs-welfare trade-off.&rdquo; Kerala/Himachal got human development
            without high growth; Gujarat/Maharashtra got growth without inclusion. TN did both.
          </p>
          <p className="text-gray-400 text-[12px] leading-relaxed mb-4">
            The mechanism wasn&rsquo;t handouts. The anti-caste / Self-Respect movement
            redistributed <em className="text-gray-300">access to opportunity</em> — education,
            urban jobs, social infrastructure — not just income. Schemes like Pudhumai Penn,
            free bus travel and the breakfast scheme are <strong className="text-gray-200">that
            mechanism</strong>: the reason TN sustains broad-based growth.
          </p>

          {/* Achievements */}
          <div className="text-[11px] uppercase tracking-wider text-violet-400/70 mb-2">
            Citable outcomes
          </div>
          <div className="space-y-2 mb-4">
            {ACHIEVEMENTS.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex gap-2.5 text-[12.5px] text-gray-300 leading-relaxed">
                  <Icon size={14} className="text-violet-400 shrink-0 mt-0.5" />
                  <span>{a.text}</span>
                </div>
              );
            })}
          </div>

          {/* Honest caveats */}
          <div className="rounded-md border border-amber-900/40 bg-amber-950/15 px-3 py-2.5 mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300/90 mb-1.5">
              <AlertTriangle size={12} /> The model&rsquo;s real strains (the authors&rsquo; own caveats)
            </div>
            <ul className="space-y-1">
              {CAVEATS.map((c, i) => (
                <li key={i} className="text-[12px] text-gray-400 leading-relaxed flex gap-1.5">
                  <span className="text-amber-600/70">·</span><span>{c}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-500 mt-2 italic">
              Stated up front on purpose — a real model with real limits, not propaganda.
            </p>
          </div>

          {/* Sources */}
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10.5px] text-violet-400 hover:text-violet-300 flex items-center gap-1 bg-violet-950/40 border border-violet-900/40 px-2 py-1 rounded"
              >
                {s.label} <ExternalLink size={9} />
              </a>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-2">
            Source: Kalaiyarasan A. &amp; M. Vijayabaskar, <em>The Dravidian Model</em>
            (Cambridge University Press, 2021) — open-access essays only; the book is not reproduced.
          </p>
        </div>
      )}
    </section>
  );
}
