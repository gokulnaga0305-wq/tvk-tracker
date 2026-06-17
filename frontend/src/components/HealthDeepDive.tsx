'use client';
/**
 * Health deep-dive — the public-health system other states study, plus the
 * NEET / A.K. Rajan story (the clearest data case that a central "merit" exam
 * reversed the Dravidian democratisation of medicine).
 * Sources: NFHS-5 / SRS; Dvara Research; NHSRC Health Dossier; A.K. Rajan
 * High-Level Committee Report (2021); The Indian Express; The News Minute.
 */
import {
  HeartPulse, Building2, Stethoscope, Syringe, AlertTriangle, ShieldCheck,
} from 'lucide-react';

// TN health outcomes vs India (NFHS-5 / SRS). Most are "lower = better".
const OUTCOMES = [
  { k: 'Infant mortality (per 1,000)', tn: '18.6', india: '40.7', good: true },
  { k: 'Under-5 mortality (per 1,000)', tn: '22.3', india: '49.7', good: true },
  { k: 'Maternal mortality (per lakh)', tn: '60', india: '113', good: true },
  { k: 'Institutional births', tn: '99.6%', india: '88.6%', good: true },
  { k: 'Children fully immunised', tn: '89.2%', india: '76.4%', good: true },
  { k: 'Allopathic doctors / 1,000', tn: '2', india: '1', good: true },
];

const INFRA = [
  { icon: Building2, k: '~1,420 PHCs', v: 'One primary health centre per ~30,000 people (~20,000 in hills) — up from ~400 in the early 1980s.' },
  { icon: Building2, k: '8,713 sub-centres', v: 'A government health point within a few km of almost every village (~1 per 5,100 people).' },
  { icon: Stethoscope, k: 'Medical college push', v: 'Government medical colleges built towards one in nearly every district — expanding the doctor pipeline.' },
  { icon: Syringe, k: 'Life expectancy 72 yrs', v: 'Above the national ~69 — the payoff of decades of primary-health investment.' },
];

// A.K. Rajan committee: medical-admission demographics pre- vs post-NEET.
const NEET = [
  { k: 'Rural students (govt med colleges)', pre: '61.5%', post: '49.9%' },
  { k: 'Government-school students (MBBS)', pre: '14.4%', post: '1.7%' },
  { k: 'Tamil-medium students', pre: '14.9%', post: '2.0%' },
  { k: 'Got a seat on the FIRST attempt', pre: '99%', post: '29%' },
];

export default function HealthDeepDive() {
  return (
    <div className="space-y-5 mt-8">
      <div className="flex items-center gap-2">
        <HeartPulse size={20} className="text-rose-400" />
        <h2 className="text-lg font-bold text-white">Health — the system other states study</h2>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed -mt-2">
        TN built one of India&rsquo;s strongest public-health networks — a clinic within reach of nearly every village, and
        outcomes that beat the national average on every major indicator. Then it shows what happened when a one-size-fits-all
        central exam was layered on top.
      </p>

      {/* Infrastructure */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="text-sm font-semibold text-white mb-4">A clinic within reach</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {INFRA.map((i) => {
            const Icon = i.icon;
            return (
              <div key={i.k} className="rounded-md border border-[#262626] bg-[#141414] p-3 flex gap-3">
                <Icon size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[13px] font-semibold text-white">{i.k}</div>
                  <div className="text-[12px] text-gray-400 leading-relaxed">{i.v}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Outcomes vs India */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="text-sm font-semibold text-white mb-1">TN vs India — the outcomes</div>
        <p className="text-[11px] text-gray-500 mb-4">NFHS-5 / SRS. TN beats the national average on every line.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {OUTCOMES.map((o) => (
            <div key={o.k} className="rounded-md border border-[#262626] bg-[#141414] px-3 py-2.5">
              <div className="text-[11px] text-gray-500 leading-snug mb-1">{o.k}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-emerald-300">{o.tn}</span>
                <span className="text-[11px] text-gray-600">TN</span>
                <span className="text-[11px] text-gray-500 ml-auto">India {o.india}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NEET — the centerpiece */}
      <section className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={16} className="text-amber-400" />
          <h3 className="text-[15px] font-bold text-white">NEET undid it — what the A.K. Rajan Committee found</h3>
        </div>
        <p className="text-[12.5px] text-gray-400 leading-relaxed mb-4">
          For decades, TN&rsquo;s state-board route let rural, poor, Tamil-medium and government-school students become doctors — the
          democratisation of medicine that staffed those village clinics. When the central NEET exam became the sole gate
          (2017-18), the government-appointed committee (Justice A.K. Rajan, 2021) measured the reversal:
        </p>

        {/* before / after table */}
        <div className="rounded-md border border-[#2a2a2a] bg-[#141414] overflow-hidden mb-4">
          <div className="grid grid-cols-[1fr_auto_auto] text-[11px] text-gray-500 uppercase tracking-wide px-3 py-2 border-b border-[#262626]">
            <span>Share of MBBS seats</span>
            <span className="w-20 text-right">Pre-NEET</span>
            <span className="w-20 text-right">Post-NEET</span>
          </div>
          {NEET.map((n) => (
            <div key={n.k} className="grid grid-cols-[1fr_auto_auto] items-center px-3 py-2 border-b border-[#1f1f1f] last:border-0">
              <span className="text-[12.5px] text-gray-300">{n.k}</span>
              <span className="w-20 text-right text-[13px] text-gray-400">{n.pre}</span>
              <span className="w-20 text-right text-[14px] font-bold text-red-400">{n.post}</span>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-red-900/40 bg-red-950/15 px-3 py-2.5 mb-3">
          <p className="text-[12.5px] text-gray-300 leading-relaxed">
            The committee also found <span className="text-white">99% of those who won a seat had paid coaching</span>, and the share
            getting in only after repeated attempts rose to <span className="text-white">71%</span> — something only affluent families can
            afford. It warned TN could slide <span className="text-red-300 italic">&ldquo;back to pre-Independence days&rdquo;</span> when villages had
            only &ldquo;barefoot doctors,&rdquo; and demolished the &ldquo;merit&rdquo; defence: board-mark entrants performed marginally BETTER in MBBS
            than NEET entrants.
          </p>
        </div>

        <div className="rounded-md border border-emerald-800/40 bg-emerald-950/15 px-3 py-2.5">
          <div className="flex gap-2 text-[12.5px] text-gray-200 leading-relaxed">
            <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <span className="text-emerald-300 font-medium">TN&rsquo;s response — equity, restored: </span>
              a <span className="text-white">7.5% horizontal reservation</span> for government-school students in professional courses
              (₹1,512 cr, 54,301 students supported), plus an Assembly bill seeking exemption from NEET. The Dravidian model didn&rsquo;t
              accept the reversal — it legislated against it.
            </span>
          </div>
        </div>
      </section>

      <p className="text-[11px] text-gray-600 leading-relaxed px-1">
        Sources: NFHS-5 (2019-21) &amp; SRS; Dvara Research (Political Economy of Health: Tamil Nadu); NHSRC Health Dossier 2021;
        Report of the High-Level Committee to Study the Impact of NEET on Medical Admissions in Tamil Nadu (Justice A.K. Rajan,
        2021); The Indian Express; The News Minute. Pre-/post-NEET figures are the committee&rsquo;s, comparing 2016-17 with 2020-21.
      </p>
    </div>
  );
}
