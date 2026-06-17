'use client';
/**
 * Research Insights — the intellectual spine. Distils what the peer-reviewed
 * scholarship (the bibliography below) actually argues, turning the data tabs
 * into a coherent thesis. Each card = a finding + the scholars behind it.
 * Sources: Kalaiyarasan & Vijayabaskar, "The Dravidian Model" (Cambridge 2021);
 * Kalaiyarasan, "A Comparison of Developmental Outcomes in Gujarat and Tamil
 * Nadu" (EPW 2014); Prerna Singh, "How Solidarity Works for Welfare" (Cambridge
 * 2015); Drèze & Sen, "An Uncertain Glory"; Jaffrelot (The Wire, 2025).
 */
import { BookMarked, Lightbulb } from 'lucide-react';

const INSIGHTS = [
  {
    title: 'The “growth vs equity” trade-off is a myth',
    body: 'The dominant assumption is that you grow first and redistribute later. Tamil Nadu reversed it — it democratised access to education, health and opportunity FIRST, and that broad base is what made growth inclusive and durable. Inclusivity fed growth, not the other way round.',
    src: 'Kalaiyarasan & Vijayabaskar, The Dravidian Model (Cambridge, 2021)',
  },
  {
    title: 'Growth WITH development — the debate, settled',
    body: 'The Bhagwati–Sen argument over India’s path has a clean answer in the data: Gujarat is growth WITHOUT development (high GDP, lagging health & schooling); Kerala is development WITHOUT growth (great human indicators, weak, remittance-reliant growth). Tamil Nadu is the only large state that did BOTH.',
    src: 'Kalaiyarasan, EPW (2014); Drèze & Sen, An Uncertain Glory',
  },
  {
    title: 'TN started BEHIND Gujarat — then overtook it',
    body: 'This is the killer fact. Unlike Kerala, TN had no head start; on many indicators Gujarat was ahead in the 1990s. Yet TN went on to beat Gujarat on nearly every development outcome — and on the rate of improvement — despite Gujarat’s slightly higher GDP growth. Policy, not luck.',
    src: 'Kalaiyarasan, EPW (2014)',
  },
  {
    title: 'Why TN chose welfare: a shared “we-ness”',
    body: 'The deepest explanation isn’t money — it’s identity. A strong Tamil subnational solidarity made political elites feel responsible for the whole community, so they prioritised public goods (schools, clinics) over narrow patronage. Where that solidarity is weak (UP, Bihar), welfare lagged. Identity drove development, not the reverse.',
    src: 'Prerna Singh, How Solidarity Works for Welfare (Cambridge, 2015)',
  },
  {
    title: 'Labour-intensive growth, not capital-heavy',
    body: 'Two industrial states, two philosophies. Gujarat’s growth is capital-intensive (fewer jobs per rupee); TN’s is labour-intensive and spread across districts — it employs MORE factory workers (≈2.2 million vs Gujarat’s ≈1.6 million) and distributes wealth more evenly. That’s why TN’s growth reaches the bottom.',
    src: 'Jaffrelot (2025); Annual Survey of Industries',
  },
  {
    title: 'The mechanism: democratise opportunity',
    body: 'Anti-caste mobilisation → reservation + free, universal education + a public-health network → a broad professional and entrepreneurial class drawn from every caste (recall: backward castes own 68% of TN’s enterprises). Redistribution of OPPORTUNITY, made permanent as political common sense, is the engine the whole tab measures.',
    src: 'Kalaiyarasan & Vijayabaskar, The Dravidian Model (2021)',
  },
];

export default function ResearchInsights() {
  return (
    <div className="space-y-5 mt-8">
      <div className="flex items-center gap-2">
        <Lightbulb size={20} className="text-amber-300" />
        <h2 className="text-lg font-bold text-white">What the scholarship concludes</h2>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed -mt-2">
        The charts above are the evidence; this is the argument they add up to — drawn from the peer-reviewed research on
        Tamil Nadu’s political economy (the full bibliography sits at the foot of this page). It’s not a slogan; it’s the
        considered finding of economists and political scientists who studied the data for decades.
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        {INSIGHTS.map((it) => (
          <div key={it.title} className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 flex flex-col">
            <div className="flex items-start gap-2 mb-1.5">
              <BookMarked size={15} className="text-amber-300 shrink-0 mt-0.5" />
              <div className="text-[13.5px] font-semibold text-white leading-snug">{it.title}</div>
            </div>
            <p className="text-[12.5px] text-gray-400 leading-relaxed flex-1">{it.body}</p>
            <div className="text-[10.5px] text-gray-600 mt-2 pt-2 border-t border-white/5">{it.src}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
