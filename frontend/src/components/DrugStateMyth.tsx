'use client';
/**
 * Drug-State Myth — built for a first-time visitor. The whole point is ONE
 * simple idea: catching drugs is not the same as using drugs. TN ranks HIGH on
 * enforcement (police work) and LOW on actual use (Govt of India survey). Heavy
 * on plain language + simple bars; light on jargon. Honest: concedes the real
 * synthetic-drug problem.
 *
 * Sources: National Survey on Substance Use in India 2019 (AIIMS-NDDTC / Ministry
 * of Social Justice); NCRB / TN police NDPS figures; The South First.
 */
import { ShieldAlert, Siren, Users, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

// Child substance use (current use %), Govt of India 2019 survey. A few states
// + India avg + TN, so the gap is obvious. TN is highlighted.
const USE_BARS = [
  { s: 'Arunachal Pradesh', v: 8.65 },
  { s: 'Delhi', v: 7.85 },
  { s: 'Goa', v: 4.67 },
  { s: 'Punjab', v: 1.79 },
  { s: 'India (average)', v: 1.17, avg: true },
  { s: 'Karnataka', v: 0.77 },
  { s: 'Tamil Nadu', v: 0.37, tn: true },
];
const MAXV = 9;

export default function DrugStateMyth() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={22} className="text-emerald-400" />
          <h1 className="text-xl sm:text-2xl font-bold text-white">Is Tamil Nadu a &ldquo;drug state&rdquo;?</h1>
        </div>
        <p className="text-gray-400 text-[14px] leading-relaxed">
          A loud narrative says Tamil Nadu is overrun by drugs. But the <span className="text-white">Government of India&rsquo;s
          own survey</span> says the opposite — TN is among the <span className="text-emerald-300">lowest</span> states for actual
          drug use. Here&rsquo;s the simple truth, in one idea.
        </p>
      </div>

      {/* THE ONE BIG IDEA — the analogy */}
      <section className="rounded-xl border border-sky-800/40 bg-sky-950/15 p-5">
        <div className="text-[12px] uppercase tracking-wider text-sky-300/80 mb-2 font-semibold">The trick to watch for</div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
          <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-4 text-center">
            <Siren size={26} className="text-amber-400 mx-auto mb-1.5" />
            <div className="text-[15px] font-bold text-white">Catching drugs</div>
            <div className="text-[12px] text-gray-500">how hard the police work</div>
          </div>
          <div className="text-center text-2xl font-bold text-gray-500">≠</div>
          <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-4 text-center">
            <Users size={26} className="text-emerald-400 mx-auto mb-1.5" />
            <div className="text-[15px] font-bold text-white">Using drugs</div>
            <div className="text-[12px] text-gray-500">how many people actually use</div>
          </div>
        </div>
        <p className="text-[13px] text-gray-300 leading-relaxed mt-3 text-center">
          If a town hires <span className="text-white">more police</span> and catches more thieves, it doesn&rsquo;t mean there are
          more thieves — it means <span className="text-white">better policing</span>. The &ldquo;drug state&rdquo; claim mixes
          these two up.
        </p>
      </section>

      {/* USE vs CASES — the core contrast */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section className="rounded-lg border border-emerald-800/50 bg-emerald-950/15 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-emerald-400" />
            <span className="text-[13px] font-semibold text-emerald-200">Drug USE in TN</span>
          </div>
          <div className="text-3xl font-bold text-emerald-300">LOW</div>
          <p className="text-[12.5px] text-gray-400 mt-1 leading-relaxed">
            How many people actually use drugs. TN is among the <span className="text-gray-200">lowest states in India</span> —
            below the national average for every drug.
          </p>
        </section>
        <section className="rounded-lg border border-amber-800/50 bg-amber-950/12 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Siren size={16} className="text-amber-400" />
            <span className="text-[13px] font-semibold text-amber-200">Drug CASES in TN</span>
          </div>
          <div className="text-3xl font-bold text-amber-300">HIGH</div>
          <p className="text-[12.5px] text-gray-400 mt-1 leading-relaxed">
            How many cases the police register. TN is high — <span className="text-gray-200">because the police work hard</span>
            and catch a lot. This is the number the narrative misuses.
          </p>
        </section>
      </div>

      {/* PROOF 1 — who actually uses the most (bar chart) */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <h2 className="text-[14px] font-semibold text-white mb-1">Who actually uses drugs the most?</h2>
        <p className="text-[12px] text-gray-500 mb-4">Children&rsquo;s drug use, % (Govt of India&rsquo;s 2019 national survey). Longer bar = more use.</p>
        <div className="space-y-2">
          {USE_BARS.map((b) => (
            <div key={b.s} className="flex items-center gap-2">
              <div className={`w-32 sm:w-40 shrink-0 text-[12px] text-right ${b.tn ? 'text-emerald-300 font-semibold' : b.avg ? 'text-gray-300' : 'text-gray-400'}`}>{b.s}</div>
              <div className="flex-1 h-5 rounded bg-[#111] overflow-hidden">
                <div
                  className={`h-full rounded ${b.tn ? 'bg-emerald-500' : b.avg ? 'bg-gray-500' : 'bg-rose-500/70'}`}
                  style={{ width: `${Math.max((b.v / MAXV) * 100, 3)}%` }}
                />
              </div>
              <div className={`w-12 shrink-0 text-[12px] tabular-nums ${b.tn ? 'text-emerald-300 font-semibold' : 'text-gray-400'}`}>{b.v}%</div>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-gray-400 mt-3 leading-relaxed">
          Tamil Nadu (<span className="text-emerald-300 font-semibold">0.37%</span>) is <span className="text-white">far below</span> the
          national average (1.17%). The real high-use places are Delhi, the North-East and Punjab — <span className="text-white">not TN</span>.
        </p>
      </section>

      {/* PROOF 2 — injecting drugs, TN not in top 10 */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
        <div className="text-[13px] text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">People who inject drugs — the top states:</span> Uttar Pradesh · Punjab · Delhi ·
          Andhra Pradesh · Telangana · Haryana · Karnataka · Maharashtra…
          <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-emerald-950/30 border border-emerald-800/40 px-3 py-1.5">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span className="text-emerald-200 text-[13px] font-medium">Tamil Nadu is NOT in the top 10.</span>
          </div>
        </div>
      </section>

      {/* THE CLINCHER — arrests up, drugs down */}
      <section className="rounded-lg border border-violet-800/40 bg-violet-950/12 p-5">
        <h2 className="text-[14px] font-semibold text-white mb-3">The clincher: under the DMK government (2021–26)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-4">
            <div className="flex items-center gap-2 text-emerald-300 mb-1"><TrendingUp size={18} /> <span className="text-[13px] font-semibold">Arrests went UP</span></div>
            <div className="text-[15px] text-gray-200 font-bold">14,394 <ArrowRight size={13} className="inline text-gray-500" /> 17,903</div>
            <div className="text-[11px] text-gray-500">drug arrests per year</div>
          </div>
          <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-4">
            <div className="flex items-center gap-2 text-rose-300 mb-1"><TrendingDown size={18} /> <span className="text-[13px] font-semibold">Drugs seized went DOWN</span></div>
            <div className="text-[15px] text-gray-200 font-bold">28,383 kg <ArrowRight size={13} className="inline text-gray-500" /> 21,424 kg</div>
            <div className="text-[11px] text-gray-500">ganja seized per year</div>
          </div>
        </div>
        <p className="text-[13px] text-gray-300 leading-relaxed mt-3">
          More arrests but <span className="text-white">less drugs found</span> = <span className="text-violet-200 font-medium">more policing,
          not more drugs</span>. If TN were flooding with drugs, seizures would <span className="text-white">rise</span>, not fall.
        </p>
      </section>

      {/* WHAT DMK DID */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <h2 className="text-[14px] font-semibold text-white mb-3">What the government actually did about drugs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12.5px] text-gray-300">
          {[
            'Created a dedicated drug-enforcement bureau (EB-CID, 2022)',
            '“Drug-Free Tamil Nadu” — ~30 lakh students took an anti-drug pledge',
            'Anti-Narcotics Unit (2024): 90 trafficking networks busted',
            'Cannabis crops worth ~₹4,000 crore destroyed; assets frozen',
          ].map((t) => (
            <div key={t} className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HONEST CONCESSION */}
      <section className="rounded-lg border border-amber-900/40 bg-amber-950/12 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-gray-300 leading-relaxed">
            <span className="text-amber-200 font-semibold">Being honest — TN is not drug-free.</span> Synthetic &ldquo;party&rdquo; pills
            among youth are a real and rising worry, ganja still flows in from Andhra &amp; Odisha, and there have been genuine
            tragedies. The point isn&rsquo;t that there&rsquo;s zero problem — it&rsquo;s that TN <span className="text-white">uses
            less than most states</span> and the government <span className="text-white">cracked down hard</span>.
          </p>
        </div>
      </section>

      {/* BOTTOM LINE */}
      <section className="rounded-xl border border-emerald-800/50 bg-emerald-950/15 p-5">
        <div className="text-[12px] uppercase tracking-wider text-emerald-300/80 mb-1 font-semibold">Bottom line</div>
        <p className="text-[15px] text-gray-100 leading-relaxed font-medium">
          Tamil Nadu ranks <span className="text-amber-300">high on catching drugs</span> and
          <span className="text-emerald-300"> low on using them.</span> Calling that &ldquo;a drug state&rdquo; confuses the
          <span className="text-white"> crackdown for the crime.</span>
        </p>
      </section>

      <p className="text-[10px] text-gray-600 leading-relaxed">
        Sources: National Survey on Extent &amp; Pattern of Substance Use in India, 2019 — AIIMS-NDDTC / Ministry of Social Justice
        &amp; Empowerment (use/prevalence figures) · NCRB &amp; Tamil Nadu police NDPS case/seizure data (enforcement) · The South
        First. &ldquo;Use&rdquo; figures are the government&rsquo;s own survey; enforcement figures reflect policing, not prevalence.
        TN is not drug-free — synthetic-drug use among youth is a genuine, rising concern.
      </p>
    </div>
  );
}
