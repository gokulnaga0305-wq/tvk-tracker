'use client';
/**
 * Findings from the literature — the annotated payoff of researching every
 * source in the bibliography. Each card is one study's key finding about Tamil
 * Nadu's development, filterable by theme and searchable. This is the "learn
 * from every reference" deliverable.
 */
import { useState, useMemo } from 'react';
import { Microscope, Search } from 'lucide-react';
import { FINDINGS, THEMES, THEME_LABEL } from '@/lib/dravidianFindings';

const THEME_COLOR: Record<string, string> = {
  Health: 'text-rose-300 border-rose-900/50 bg-rose-950/20',
  Education: 'text-emerald-300 border-emerald-900/50 bg-emerald-950/20',
  CasteJustice: 'text-orange-300 border-orange-900/50 bg-orange-950/20',
  Welfare: 'text-amber-300 border-amber-900/50 bg-amber-950/20',
  Industry: 'text-sky-300 border-sky-900/50 bg-sky-950/20',
  Comparative: 'text-violet-300 border-violet-900/50 bg-violet-950/20',
  Theory: 'text-slate-300 border-slate-700/50 bg-slate-800/20',
};

export default function LiteratureFindings() {
  const [theme, setTheme] = useState<string>('All');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return FINDINGS.filter(
      (f) =>
        (theme === 'All' || f.t === theme) &&
        (!s || f.f.toLowerCase().includes(s) || f.r.toLowerCase().includes(s))
    );
  }, [theme, q]);

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center gap-2">
        <Microscope size={20} className="text-emerald-300" />
        <h2 className="text-lg font-bold text-white">Findings from the literature</h2>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed -mt-2">
        We didn&rsquo;t just list the bibliography — we researched <span className="text-gray-200">every source in it</span> and pulled out
        what each one actually found about Tamil Nadu. Below is that evidence, distilled to one finding per study. Filter by theme or
        search it. Where a study is <span className="text-gray-300">critical or a caveat</span>, we kept it in — that&rsquo;s what makes the
        case honest.
      </p>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        {['All', ...THEMES].map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`px-2.5 py-1 rounded-md border text-[11.5px] transition-colors ${
              theme === t
                ? 'border-emerald-600 bg-emerald-950/40 text-emerald-200 font-medium'
                : 'border-[#2a2a2a] bg-[#161616] text-gray-400 hover:text-white'
            }`}
          >
            {t === 'All' ? 'All' : THEME_LABEL[t]}
          </button>
        ))}
        <div className="flex items-center gap-2 flex-1 min-w-[180px] rounded-md border border-[#2a2a2a] bg-[#141414] px-3 py-1.5">
          <Search size={13} className="text-gray-500 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search findings (e.g. PDS, NEET, Tiruppur, Gujarat)…"
            className="bg-transparent text-[12px] text-gray-200 placeholder:text-gray-600 outline-none w-full"
          />
        </div>
      </div>

      <div className="text-[11px] text-gray-500">{filtered.length} findings</div>

      {/* findings */}
      <div className="grid md:grid-cols-2 gap-2.5">
        {filtered.map((f, i) => (
          <div key={i} className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3.5 flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${THEME_COLOR[f.t]}`}>
                {THEME_LABEL[f.t]}
              </span>
            </div>
            <p className="text-[12.5px] text-gray-300 leading-relaxed flex-1">{f.f}</p>
            <div className="text-[10.5px] text-gray-600 mt-2 pt-2 border-t border-white/5">{f.r}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-gray-600 italic text-[12.5px] py-4">No findings match that filter.</div>
        )}
      </div>
    </div>
  );
}
