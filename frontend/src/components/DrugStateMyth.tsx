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

// Charas/ganja current use, % (Govt of India 2019 survey). Ganja is what the
// "drug state" claim is really about — and TN is among the LOWEST.
const GANJA_BARS = [
  { s: 'Sikkim', v: 7.5 },
  { s: 'Nagaland', v: 4.7 },
  { s: 'Delhi', v: 3.8 },
  { s: 'Uttar Pradesh', v: 3.2 },
  { s: 'India (average)', v: 1.2, avg: true },
  { s: 'Tamil Nadu', v: 0.1, tn: true },
];
const MAXG = 8;

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

      {/* PROOF 1b — ganja, the drug the narrative is really about */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <h2 className="text-[14px] font-semibold text-white mb-1">And ganja — the drug the &ldquo;drug state&rdquo; claim is really about?</h2>
        <p className="text-[12px] text-gray-500 mb-4">Charas/ganja current use, % (same Govt of India survey). Tamil Nadu is near the very bottom.</p>
        <div className="space-y-2">
          {GANJA_BARS.map((b) => (
            <div key={b.s} className="flex items-center gap-2">
              <div className={`w-32 sm:w-40 shrink-0 text-[12px] text-right ${b.tn ? 'text-emerald-300 font-semibold' : b.avg ? 'text-gray-300' : 'text-gray-400'}`}>{b.s}</div>
              <div className="flex-1 h-5 rounded bg-[#111] overflow-hidden">
                <div className={`h-full rounded ${b.tn ? 'bg-emerald-500' : b.avg ? 'bg-gray-500' : 'bg-rose-500/70'}`}
                     style={{ width: `${Math.max((b.v / MAXG) * 100, 2)}%` }} />
              </div>
              <div className={`w-12 shrink-0 text-[12px] tabular-nums ${b.tn ? 'text-emerald-300 font-semibold' : 'text-gray-400'}`}>{b.v}%</div>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-gray-400 mt-3 leading-relaxed">
          Tamil Nadu&rsquo;s ganja use is <span className="text-emerald-300 font-semibold">0.1%</span> — about
          <span className="text-white"> a twelfth</span> of the national average (1.2%) and tied for the lowest in India. Sikkim
          (7.5%), Nagaland and Delhi are the real ganja states.
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

      {/* TN'S OWN NUMBERS — closer look */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <h2 className="text-[14px] font-semibold text-white mb-1">A closer look — Tamil Nadu&rsquo;s own numbers</h2>
        <p className="text-[12px] text-gray-500 mb-4">Not just &ldquo;TN vs other states&rdquo; — here&rsquo;s what TN&rsquo;s own police data shows.</p>

        {/* 1. shifting, not flooding */}
        <div className="rounded-md border border-[#262626] bg-[#141414] p-4 mb-3">
          <div className="text-[13px] font-semibold text-gray-200 mb-3">1. The problem is <span className="text-white">shifting</span>, not flooding</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center gap-1.5 text-[12px] text-emerald-300 mb-2"><TrendingDown size={14} /> Old ganja — going DOWN</div>
              <div className="flex items-end gap-3 h-20">
                {[{ y: '2022', v: 28383 }, { y: '2023', v: 23364 }, { y: '2024', v: 21424 }].map((g) => (
                  <div key={g.y} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[10px] text-gray-400">{(g.v / 1000).toFixed(1)}k</span>
                    <div className="w-full rounded-t bg-emerald-600/60" style={{ height: `${(g.v / 28383) * 100}%` }} />
                    <span className="text-[10px] text-gray-600 mt-0.5">{g.y}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10.5px] text-gray-600 mt-1">ganja seized (kg/year)</div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[12px] text-rose-300 mb-1"><TrendingUp size={14} /> New synthetic pills — going UP</div>
              <div className="text-3xl font-bold text-rose-300">+255%</div>
              <div className="text-[11px] text-gray-500">narcotic tablets seized, jump in 2024</div>
            </div>
          </div>
          <p className="text-[12px] text-gray-400 mt-3">Old-style ganja is <span className="text-emerald-300">falling</span>; new <span className="text-rose-300">synthetic &ldquo;party pills&rdquo;</span> among youth are the real, rising worry.</p>
        </div>

        {/* 2. doesn't grow it — transit */}
        <div className="rounded-md border border-[#262626] bg-[#141414] p-4 mb-3">
          <div className="text-[13px] font-semibold text-gray-200 mb-2">2. Tamil Nadu doesn&rsquo;t <span className="text-white">grow</span> it</div>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="rounded bg-rose-950/40 border border-rose-900/40 text-rose-200 px-2 py-1">Grown in Andhra &amp; Odisha</span>
            <ArrowRight size={14} className="text-gray-600" />
            <span className="rounded bg-amber-950/40 border border-amber-900/40 text-amber-200 px-2 py-1">Passes THROUGH Tamil Nadu</span>
            <ArrowRight size={14} className="text-gray-600" />
            <span className="rounded bg-[#222] border border-[#333] text-gray-300 px-2 py-1">Coast → Sri Lanka</span>
          </div>
          <p className="text-[12px] text-gray-400 mt-2">TN&rsquo;s own ganja cultivation is <span className="text-white">zero</span> (state police). It&rsquo;s a <span className="text-white">transit route, not a source</span> — in one year Odisha seized ~1.7 lakh kg and Andhra ~1.4 lakh kg, vs TN&rsquo;s far smaller ~5,300 kg.</p>
        </div>

        {/* 3. concentrated */}
        <div className="rounded-md border border-[#262626] bg-[#141414] p-4">
          <div className="text-[13px] font-semibold text-gray-200 mb-1">3. It&rsquo;s <span className="text-white">concentrated</span>, not everywhere</div>
          <p className="text-[12px] text-gray-400">Cases cluster at <span className="text-gray-200">coastal smuggling points</span> (Ramanathapuram → Sri Lanka) and a few <span className="text-gray-200">college belts</span> (Coimbatore, Chennai) — not spread evenly across the state. Seizures show where <span className="text-white">police focus</span>, not where everyone uses.</p>
        </div>
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
            <span className="text-amber-200 font-semibold">Being honest — TN is not drug-free.</span> The synthetic-pill problem is
            real and rising: <span className="text-white">1 in 3</span> people caught peddling them in Chennai are <span className="text-white">under 25</span>,
            and police even busted a <span className="text-white">student-run meth lab</span>. And we&rsquo;re not cherry-picking:
            on <span className="text-white">alcohol</span> TN sits around the national average (~28% vs India ~27%) — not low. The
            point isn&rsquo;t that there&rsquo;s zero problem — it&rsquo;s that on <span className="text-white">narcotics</span> TN
            uses less than most states, the drugs mostly <span className="text-white">pass through</span> rather than grow here,
            and the government <span className="text-white">cracked down hard</span>.
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
        &amp; Empowerment (use/prevalence figures) · Tamil Nadu Enforcement Bureau-CID / NIB-CID &amp; Greater Chennai Police
        NDPS data, via The Federal, Outlook, The South First, DT Next (year-by-year cases/seizures, ANIU); YouTurn fact-check
        (Odisha/Andhra vs TN ganja). &ldquo;Use&rdquo; figures are the government&rsquo;s own survey; all case/seizure figures are
        ENFORCEMENT (policing), not prevalence, and TN&rsquo;s 2023–24 NCRB tables are unpublished, so recent state figures are
        police briefings. TN is not drug-free — synthetic-drug use among youth is a genuine, rising concern.
      </p>
    </div>
  );
}
