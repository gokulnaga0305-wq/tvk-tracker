'use client';
/**
 * Bibliography — the academic evidence base. Searchable, collapsible list of the
 * scholarly sources underpinning the Dravidian Model analysis, transcribed from
 * the reference list of Kalaiyarasan & Vijayabaskar's "The Dravidian Model"
 * (Cambridge, 2021).
 */
import { useState, useMemo } from 'react';
import { BookOpen, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { BIBLIOGRAPHY } from '@/lib/dravidianBibliography';

export default function Bibliography() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return BIBLIOGRAPHY;
    return BIBLIOGRAPHY.filter((c) => c.toLowerCase().includes(s));
  }, [q]);

  // When searching, always show results; otherwise respect the collapse toggle.
  const showList = open || q.trim().length > 0;

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center gap-2">
        <BookOpen size={20} className="text-sky-400" />
        <h2 className="text-lg font-bold text-white">The evidence base — academic bibliography</h2>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed -mt-2">
        This tab isn&rsquo;t opinion — it stands on decades of peer-reviewed scholarship on Tamil Nadu&rsquo;s political economy,
        anchored by <span className="text-gray-200">&ldquo;The Dravidian Model&rdquo;</span> (Kalaiyarasan A. &amp; M. Vijayabaskar,
        Cambridge University Press, 2021). Its full reference list — <span className="text-sky-300">{BIBLIOGRAPHY.length} sources</span> —
        is below. Search it.
      </p>

      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
        {/* search + toggle */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 rounded-md border border-[#2a2a2a] bg-[#141414] px-3 py-2">
            <Search size={14} className="text-gray-500 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search authors, titles, topics (e.g. NEET, health, caste, Kerala)…"
              className="bg-transparent text-[12.5px] text-gray-200 placeholder:text-gray-600 outline-none w-full"
            />
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-white px-2 py-2 shrink-0"
          >
            {showList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showList ? 'Hide' : 'Show all'}
          </button>
        </div>

        {q.trim() && (
          <div className="text-[11px] text-gray-500 mb-2">{filtered.length} matching source{filtered.length === 1 ? '' : 's'}</div>
        )}

        {showList ? (
          <ol className="max-h-[28rem] overflow-y-auto pr-2 space-y-1.5 text-[12px] text-gray-400 leading-relaxed">
            {filtered.map((c, i) => (
              <li key={i} className="pl-4 -indent-4 border-b border-white/[0.03] pb-1.5">{c}</li>
            ))}
            {filtered.length === 0 && (
              <li className="text-gray-600 italic">No sources match &ldquo;{q}&rdquo;.</li>
            )}
          </ol>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full text-center text-[12.5px] text-sky-400 hover:text-sky-300 py-3 border border-dashed border-[#2a2a2a] rounded-md"
          >
            Show all {BIBLIOGRAPHY.length} academic sources →
          </button>
        )}
      </section>

      <p className="text-[11px] text-gray-600 leading-relaxed px-1">
        Reference list of &ldquo;The Dravidian Model: Interpreting the Political Economy of Tamil Nadu&rdquo; (Kalaiyarasan A. &amp;
        M. Vijayabaskar, Cambridge University Press, 2021). &ldquo;———&rdquo; denotes a repeated author from the entry above. This is the
        scholarly foundation; the live figures elsewhere in this tab are drawn from the primary government sources (NFHS, AISHE,
        Census, RBI, Economic Census, NITI, the A.K. Rajan Committee) cited in each section.
      </p>
    </div>
  );
}
