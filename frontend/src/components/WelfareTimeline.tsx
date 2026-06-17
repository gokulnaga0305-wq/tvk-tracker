'use client';
/**
 * Welfare timeline 1921→2026 — the "investment not waste" engine. Each landmark
 * reframed as spending on people that compounded into the human-development and
 * growth numbers shown elsewhere in this tab.
 */
import { HandHeart, ArrowRight } from 'lucide-react';

const MILESTONES = [
  { yr: '1921', what: 'Communal G.O.', d: 'One of the world’s earliest affirmative-action orders — reserved education and jobs across castes, decades before independence.' },
  { yr: '1956', what: 'Free schooling + first mid-day meal', d: 'Kamaraj abolished fees and fed children — so neither money nor hunger kept a child out of class.' },
  { yr: '1967', what: 'Dravidian government', d: 'Subsidised rice and a self-respect, anti-poverty agenda — welfare as the state’s core purpose.' },
  { yr: '1982', what: 'Universal Nutritious Noon Meal', d: 'MGR universalised the school meal — then the largest feeding programme on earth; enrolment and retention jumped.' },
  { yr: '1989', what: '69% reservation', d: 'Backward, Most Backward, SC and ST quotas — later placed in the 9th Schedule to protect them from challenge.' },
  { yr: '1997', what: 'Samathuvapuram', d: '“Equality villages” — shared housing that mixed castes, attacking segregation in daily life.' },
  { yr: '2011→', what: 'Amma canteens, free laptops', d: '₹1–₹5 cooked meals in cities; laptops, mixies and grinders — lowering the cost of living and the digital divide.' },
  { yr: '2021-26', what: 'Free bus, breakfast, Magalir Urimai', d: 'Free bus travel for women, the CM breakfast scheme, ₹1,000/month to women heads-of-household — money and mobility into poor households.' },
];

export default function WelfareTimeline() {
  return (
    <div className="space-y-5 mt-8">
      <div className="flex items-center gap-2">
        <HandHeart size={20} className="text-rose-400" />
        <h2 className="text-lg font-bold text-white">The welfare engine — 100 years of “investment, not waste”</h2>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed -mt-2">
        Critics call it freebies. The data calls it compounding. Every landmark below put money, food, mobility or a fair shot
        into poor and lower-caste households — and that human capital is exactly what powered the income, health and education
        numbers in this tab.
      </p>

      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="space-y-3">
          {MILESTONES.map((m) => (
            <div key={m.yr} className="flex gap-3">
              <div className="w-16 shrink-0 text-right">
                <span className="text-[12.5px] font-bold text-rose-400">{m.yr}</span>
              </div>
              <div className="relative pl-4 border-l border-rose-900/50 pb-1">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-rose-500" />
                <div className="text-[12.5px] font-medium text-gray-200">{m.what}</div>
                <div className="text-[12.5px] text-gray-400 leading-relaxed">{m.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-200">
          <span className="text-rose-300">Welfare spending</span>
          <ArrowRight size={14} className="text-gray-500" />
          <span>healthier, schooled people</span>
          <ArrowRight size={14} className="text-gray-500" />
          <span>higher productivity &amp; women at work</span>
          <ArrowRight size={14} className="text-gray-500" />
          <span className="text-emerald-300 font-medium">growth</span>
        </div>
        <p className="text-[12px] text-gray-500 mt-1.5">That virtuous cycle — not a magic budget trick — is the whole Dravidian model.</p>
      </div>
    </div>
  );
}
