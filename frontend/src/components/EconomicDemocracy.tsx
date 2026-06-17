'use client';
/**
 * Economic Democracy — who actually OWNS the businesses. The Dravidian model's
 * deepest claim: it democratised not just votes and degrees but CAPITAL. In TN,
 * backward-caste and Dalit entrepreneurs own the economy; in most big states,
 * upper castes still do.
 * Source: Economic Census 2013-14, computed in Kalaiyarasan A. & M. Vijayabaskar,
 * "The Dravidian Model" (Cambridge, 2021); The Hindu (SC entrepreneurs).
 */
import { Scale, TrendingUp, Info } from 'lucide-react';

// backward = SC/ST + OBC; elite = upper/"general" castes. % of enterprises owned.
const GROUPS = [
  {
    title: 'All enterprises',
    rows: [
      { state: 'Tamil Nadu', backward: 82, elite: 18, hi: true },
      { state: 'Gujarat', backward: 58, elite: 43 },
      { state: 'Maharashtra', backward: 37, elite: 63 },
    ],
  },
  {
    title: 'Large enterprises (100+ workers)',
    rows: [
      { state: 'Tamil Nadu', backward: 73, elite: 27, hi: true },
      { state: 'Gujarat', backward: 23, elite: 77 },
      { state: 'Maharashtra', backward: 14, elite: 86 },
    ],
  },
];

function StackBar({ r }: { r: { state: string; backward: number; elite: number; hi?: boolean } }) {
  return (
    <div className="py-1.5">
      <div className={`text-[12px] mb-1 ${r.hi ? 'text-orange-300 font-semibold' : 'text-gray-400'}`}>{r.state}</div>
      <div className="flex h-6 rounded overflow-hidden text-[10.5px] font-medium">
        <div className="bg-orange-500 flex items-center justify-center text-orange-950" style={{ width: `${r.backward}%` }}>
          {r.backward >= 12 ? `${r.backward}%` : ''}
        </div>
        <div className="bg-[#3a3a3a] flex items-center justify-center text-gray-300" style={{ width: `${r.elite}%` }}>
          {r.elite >= 12 ? `${r.elite}%` : ''}
        </div>
      </div>
    </div>
  );
}

export default function EconomicDemocracy() {
  return (
    <div className="space-y-5 mt-8">
      <div className="flex items-center gap-2">
        <Scale size={20} className="text-orange-400" />
        <h2 className="text-lg font-bold text-white">Economic democracy — who owns the businesses</h2>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed -mt-2">
        The deepest test of the Dravidian model isn&rsquo;t votes or degrees — it&rsquo;s <span className="text-gray-200">capital.</span> Did
        ending caste monopoly in politics and education also break it in business? In Tamil Nadu, yes. Backward-caste and Dalit
        entrepreneurs own the economy here; in most big states, upper castes still do.
      </p>

      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 space-y-5">
        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> Backward castes (SC/ST + OBC)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#3a3a3a] inline-block" /> Upper / &ldquo;general&rdquo; castes</span>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="text-[12.5px] font-semibold text-white mb-1">{g.title}</div>
            {g.rows.map((r) => <StackBar key={r.state} r={r} />)}
          </div>
        ))}
      </section>

      <div className="rounded-lg border border-orange-900/40 bg-orange-950/15 px-4 py-3">
        <div className="flex gap-2 text-[13px] text-gray-200 leading-relaxed">
          <TrendingUp size={15} className="text-orange-400 shrink-0 mt-0.5" />
          <span>
            Read the bottom row twice: in <span className="text-white">Maharashtra, upper castes own 86% of large enterprises</span>; in
            <span className="text-white"> Tamil Nadu, backward castes own 73%.</span> TN also has had India&rsquo;s largest count of SC
            entrepreneurs. This is the Dravidian model&rsquo;s least-known achievement — it moved economic power, not just political power.
          </span>
        </div>
      </div>

      <div className="rounded-md border border-[#262626] bg-[#141414] px-4 py-3">
        <div className="flex gap-2 text-[12.5px] text-gray-300 leading-relaxed">
          <Info size={14} className="text-sky-400 shrink-0 mt-0.5" />
          <span>
            <span className="text-white font-medium">The reversal that proves it: </span>
            in 1960-61, Tamil Nadu was <span className="text-white">poorer than Bihar</span> — rural poverty 51.7% vs Bihar&rsquo;s 49.7%
            (national 38.2%). Today TN is the 2nd-largest economy and 3rd in per-capita income among large states; Bihar sits last.
            Same starting line, opposite destinations — the difference was the model.
          </span>
        </div>
      </div>

      <p className="text-[11px] text-gray-600 leading-relaxed px-1">
        Source: Economic Census 2013-14, computed in &ldquo;The Dravidian Model&rdquo; (Kalaiyarasan A. &amp; M. Vijayabaskar, Cambridge
        University Press, 2021); The Hindu. &ldquo;Backward castes&rdquo; = SC/ST + OBC; &ldquo;elite&rdquo; = upper/&ldquo;general&rdquo; castes. Percentages rounded.
      </p>
    </div>
  );
}
