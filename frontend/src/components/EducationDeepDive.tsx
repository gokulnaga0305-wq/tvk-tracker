'use client';
/**
 * Education deep-dive — the Dravidian "crown jewel". Captures the full arc:
 * Kamaraj's free schooling + first mid-day meal (1956), MGR's universal noon
 * meal (1982), 69% reservation pulling first-generation learners into college,
 * and the DMK 2021-26 wave of schemes — each with VERIFIED impact numbers.
 * Sources: TN School Education Dept 4-year report, The Hindu, The South First,
 * New Indian Express, IJFMR, State Planning Commission studies, AISHE.
 */
import {
  GraduationCap, Utensils, Home, BookOpen, Wrench, Sparkles, BookMarked,
  TrendingUp,
} from 'lucide-react';

const ARC = [
  { yr: '1956', who: 'Kamaraj', what: 'Free, fee-less schooling; thousands of new schools; the first mid-day meal — so no child stays out of school for hunger or money.' },
  { yr: '1982', who: 'MGR', what: 'Nutritious Noon Meal Scheme universalised — then the largest school-feeding programme in the world. Enrolment and retention jump.' },
  { yr: '1980s→', who: 'Social justice', what: '69% reservation entrenched (9th Schedule) — first-generation learners from SC/OBC families carried into colleges and professions.' },
  { yr: '2017-22', who: 'Outcome', what: 'TN holds the #1 higher-education enrolment ratio among all large states — five years running.' },
  { yr: '2021-26', who: 'DMK wave', what: 'Breakfast + doorstep tutoring + foundational-literacy mission + ₹1,000 stipends — the schemes below.' },
];

const SCHEMES = [
  {
    name: 'CM’s Breakfast Scheme', year: '2022', icon: Utensils,
    what: 'Free hot breakfast for classes 1–5 in govt & aided schools.',
    impact: ['20.5 lakh children', 'attendance +30%', '2.5 L + 3.7 L new enrolments', 'student hospital admissions −63%', '₹600 cr/yr'],
  },
  {
    name: 'Illam Thedi Kalvi', year: '2021', icon: Home,
    what: 'After-school tutoring at the doorstep, run by 1.65 lakh local volunteers (post-COVID recovery).',
    impact: ['95.97 lakh students reached', '50,000 centres', '₹660 cr'],
  },
  {
    name: 'Ennum Ezhuthum', year: '2022', icon: BookOpen,
    what: 'Foundational literacy & numeracy mission, classes 1–5 — every child reading, writing & doing arithmetic by 2025.',
    impact: ['25.08 lakh students', '37,767 schools', 'level-based teaching'],
  },
  {
    name: 'Naan Mudhalvan', year: '2022', icon: Wrench,
    what: 'Industry-relevant skilling for college & school youth.',
    impact: ['41.38 lakh students', '~1 lakh educators'],
  },
  {
    name: 'Pudhumai Penn', year: '2022', icon: Sparkles,
    what: '₹1,000/month to girls who studied classes 6–12 in govt schools and enter higher education (Moovalur Ramamirtham scheme).',
    impact: ['Female higher-ed enrolment +34%', '~6.95 lakh girls', 'rural girls benefited most'],
  },
  {
    name: 'Tamil Pudhalvan', year: '2024', icon: GraduationCap,
    what: '₹1,000/month to boys from Tamil-medium govt/aided schools entering higher education.',
    impact: ['4.25 lakh boys (2024-25)', 'combined with Pudhumai Penn: 12.36 lakh get ₹1,000/mo'],
  },
  {
    name: 'Vasippu Iyakkam', year: '2023', icon: BookMarked,
    what: 'Reading Movement — building a daily reading habit, classes 4–9.',
    impact: ['66 lakh students', '123 levelled readers'],
  },
];

const OUTCOMES = [
  { v: '47%', k: 'Higher-ed GER — #1 large state (India 28.4%)' },
  { v: '39.4%', k: 'SC student GER — above India’s OVERALL 28.4%' },
  { v: '+34%', k: 'Women’s higher-ed enrolment (Pudhumai Penn)' },
  { v: '+30%', k: 'School attendance (breakfast scheme)' },
  { v: '12.36 L', k: 'Students getting ₹1,000/month to stay in education' },
  { v: '~78%', k: 'Children retained to Grade 12 (Bihar ~35%)' },
];

export default function EducationDeepDive() {
  return (
    <div className="space-y-5 mt-8">
      <div className="flex items-center gap-2">
        <GraduationCap size={20} className="text-emerald-400" />
        <h2 className="text-lg font-bold text-white">Education — the Dravidian crown jewel</h2>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed -mt-2">
        Free. Fed. First-generation. The same idea runs from 1956 to 2026 — remove every barrier between a poor or
        lower-caste child and a classroom — and it’s why TN tops India on access. Here’s the full arc, and every scheme of
        the last DMK tenure, with verified numbers.
      </p>

      {/* The arc */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="text-sm font-semibold text-white mb-4">70 years, one idea</div>
        <div className="space-y-3">
          {ARC.map((a) => (
            <div key={a.yr} className="flex gap-3">
              <div className="w-16 shrink-0 text-right">
                <span className="text-[13px] font-bold text-emerald-400">{a.yr}</span>
              </div>
              <div className="relative pl-4 border-l border-emerald-900/50 pb-1">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                <div className="text-[12.5px] font-medium text-gray-200">{a.who}</div>
                <div className="text-[12.5px] text-gray-400 leading-relaxed">{a.what}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DMK 2021-26 schemes */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold text-white">The 2021–2026 wave</div>
          <span className="text-[11px] text-gray-500">DMK tenure · 7 flagship schemes</span>
        </div>
        <p className="text-[12px] text-gray-500 mb-4">Not slogans — each line below is a measured outcome.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {SCHEMES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.name} className="rounded-md border border-[#262626] bg-[#141414] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={15} className="text-emerald-400 shrink-0" />
                  <span className="text-[13.5px] font-semibold text-white">{s.name}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{s.year}</span>
                </div>
                <p className="text-[12px] text-gray-400 leading-relaxed mb-2">{s.what}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.impact.map((im) => (
                    <span key={im} className="text-[10.5px] px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/40 text-emerald-300">
                      {im}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Outcomes strip */}
      <section className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
          <TrendingUp size={15} className="text-emerald-400" /> What it added up to
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {OUTCOMES.map((o) => (
            <div key={o.k} className="rounded-md border border-emerald-900/30 bg-[#141414] px-3 py-3 text-center">
              <div className="text-2xl font-bold text-emerald-300">{o.v}</div>
              <div className="text-[11px] text-gray-400 leading-snug mt-1">{o.k}</div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-gray-600 leading-relaxed px-1">
        Sources: TN School Education Dept 4-year report (2025); The Hindu; The South First; New Indian Express; IJFMR (2025);
        TN State Planning Commission evaluations; AISHE 2021-22. Scheme figures are government-reported beneficiary/outcome
        counts; enrolment-ratio and retention figures are from AISHE/UDISE+.
      </p>
    </div>
  );
}
