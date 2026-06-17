'use client';
/**
 * The Dravidian Model — interactive myth-buster. The hater line is "Dravidian
 * rule (post-1967) ruined Tamil Nadu / it's all freebies." This tab puts TN
 * next to other states on OUTCOMES, sector by sector, and lets the data answer.
 *
 * Honest by design (the project's standard):
 *  - Every figure is from a NEUTRAL source (NFHS-5, AISHE, Census, MoSPI/RBI,
 *    PLFS, ASI, NITI), not the advocacy literature.
 *  - Where another state (usually Kerala) leads a metric, we SAY SO in the
 *    caveat. TN's defensible claim isn't "#1 at everything" — it's the only
 *    LARGE, diverse state that combined growth + industry + welfare + caste/
 *    gender equity at scale. That framing survives any fact-check.
 *  Framework reference: Kalaiyarasan A. & M. Vijayabaskar, "The Dravidian
 *  Model" (Cambridge, 2021).
 */
import { useState } from 'react';
import {
  Landmark, GraduationCap, HeartPulse, Scale, Factory, Users, HandHeart,
  TrendingUp, TrendingDown, Info, CheckCircle2, History, ArrowRight,
} from 'lucide-react';

// "Since independence" — TN's own transformation per sector. Where clean 1947
// state-level data doesn't exist, we use the earliest reliable year and label
// it honestly (Madras Presidency / SRS / Census). This is TN-then vs TN-now;
// the current cross-state ranking is the bar chart above.
const THEN_NOW: Record<string, { era: string; was: string; now: string }> = {
  income: { era: '1950s', was: 'a largely agrarian, low-income Presidency', now: '2nd-largest state economy · per-capita ~1.7× the national average' },
  education: { era: '1951', was: 'literacy ~20%', now: 'literacy 80% (2011) · higher-ed GER 47% — #1 large state' },
  social: { era: '1921', was: 'TN pioneered reservation (the Communal G.O.) before independence', now: 'SC higher-ed GER 39.4% — above India’s overall average' },
  health: { era: '1971', was: 'infant mortality ~113 per 1,000', now: 'IMR ~19 · life expectancy 72 (vs ~50 mid-century)' },
  women: { era: '1951', was: 'female literacy in single digits', now: '42% of India’s women factory workers · most in non-farm work' },
  industry: { era: '1950s', was: 'mostly farming and small trade', now: '#1 in factories · 48% urban — most urbanised large state' },
};

type Bar = { state: string; value: number; hi?: boolean };
type Sector = {
  id: string; label: string; icon: any;
  myth: string; reality: string;
  metric: string; unit: string; lowerBetter?: boolean;
  bars: Bar[];
  stats?: { k: string; v: string }[];
  caveat: string; src: string;
};

const SECTORS: Sector[] = [
  {
    id: 'income', label: 'Income', icon: Landmark,
    myth: '“Dravidian welfarism made TN poor and dependent.”',
    reality: 'TN is the 2nd-largest state economy with among the highest per-capita income in India — and one of the lowest poverty rates (~2–4% vs India ~11%).',
    metric: 'Per-capita income (GSDP)', unit: '₹ lakh · 2024-25',
    bars: [
      { state: 'Karnataka', value: 3.85 },
      { state: 'Tamil Nadu', value: 3.62, hi: true },
      { state: 'Gujarat', value: 3.31 },
      { state: 'Maharashtra', value: 3.09 },
      { state: 'India', value: 2.16 },
      { state: 'Uttar Pradesh', value: 1.08 },
      { state: 'Bihar', value: 0.66 },
    ],
    stats: [
      { k: 'Poverty (NITI MPI)', v: '~2–4% · among India’s lowest (Bihar ~26%)' },
      { k: 'Per-capita income', v: '~1.7× the national average' },
    ],
    caveat: 'Karnataka edges TN on per-capita income (Bengaluru’s IT). TN’s distinction is breadth — high income with 32 of 38 districts above the national average, not one mega-city carrying the state.',
    src: 'RBI Handbook of Statistics / Economic Survey 2024-25',
  },
  {
    id: 'education', label: 'Education', icon: GraduationCap,
    myth: '“The schooling system collapsed under Dravidian rule.”',
    reality: 'TN has the highest higher-education enrolment of any LARGE state — and retains ~78% of children to Grade 12 (Bihar ~35%).',
    metric: 'Higher-education GER (18–23 yrs)', unit: '% · AISHE 2021-22',
    bars: [
      { state: 'Tamil Nadu', value: 47, hi: true },
      { state: 'Kerala', value: 41 },
      { state: 'Telangana', value: 40 },
      { state: 'India', value: 28.4 },
      { state: 'Uttar Pradesh', value: 24 },
      { state: 'Gujarat', value: 23 },
      { state: 'Bihar', value: 14.9 },
    ],
    stats: [
      { k: 'School retention to Grade 12', v: 'TN ~78% vs Bihar ~35%' },
      { k: 'Highest college density', v: 'in the country' },
    ],
    caveat: 'Small UTs (Chandigarh 64.8%, Puducherry 61.5%) score higher, but on tiny populations. Among the 20 large states, TN is #1 — and has held that rank for five straight years.',
    src: 'AISHE 2021-22, Ministry of Education',
  },
  {
    id: 'social', label: 'Social justice', icon: Scale,
    myth: '“Reservation and ‘caste politics’ wrecked merit and the economy.”',
    reality: 'This is the heart of the Dravidian model: it DEMOCRATISED access. A Dalit child in TN now enrolls in college at a higher rate than the AVERAGE Indian student.',
    metric: 'Higher-ed GER — who gets in', unit: '% · AISHE 2021-22',
    bars: [
      { state: 'TN — all students', value: 47 },
      { state: 'TN — SC students', value: 39.4, hi: true },
      { state: 'India — all students', value: 28.4 },
      { state: 'India — SC students', value: 25.9 },
    ],
    stats: [
      { k: 'TN reservation', v: '69% — highest in India, in the 9th Schedule' },
      { k: 'TN SC/ST GER', v: 'SC 39.4% · ST 43.9% — highest among large states' },
    ],
    caveat: 'TN’s SC enrolment (39.4%) beats not just the national SC rate (25.9%) but India’s ALL-category average (28.4%). 69% reservation + free education + first-generation-graduate support is exactly why — equity, by design, not accident.',
    src: 'AISHE 2021-22; The Dravidian Model (2021)',
  },
  {
    id: 'health', label: 'Health', icon: HeartPulse,
    myth: '“Public health is a mess in TN.”',
    reality: 'Near-universal institutional delivery, fertility below replacement since the 1990s, and infant mortality less than half the national rate — built on a public-health system other states study.',
    metric: 'Total Fertility Rate', unit: 'children/woman · NFHS-5 · lower = better',
    lowerBetter: true,
    bars: [
      { state: 'Maharashtra', value: 1.7 },
      { state: 'Tamil Nadu', value: 1.76, hi: true },
      { state: 'Kerala', value: 1.8 },
      { state: 'India', value: 2.0 },
      { state: 'Uttar Pradesh', value: 2.4 },
      { state: 'Bihar', value: 3.0 },
    ],
    stats: [
      { k: 'Institutional delivery', v: 'TN ~100% (India 89%)' },
      { k: 'Infant mortality (NFHS-5)', v: 'TN 19 vs India 35, Bihar 47' },
    ],
    caveat: 'Kerala leads outright on most health metrics — and we won’t pretend otherwise. TN’s achievement is reaching near-Kerala outcomes as a much larger, more industrial, more diverse state, and getting to below-replacement fertility through women’s education, not coercion.',
    src: 'NFHS-5 (2019-21), MoHFW',
  },
  {
    id: 'women', label: 'Women & work', icon: Users,
    myth: '“TN’s growth left women behind.”',
    reality: 'TN employs nearly HALF of all of India’s women factory workers, and two-thirds of TN women work outside agriculture — the highest among big industrial states.',
    metric: 'Women in non-farm work', unit: '% of working women · higher = better',
    bars: [
      { state: 'Tamil Nadu', value: 64, hi: true },
      { state: 'Gujarat', value: 44 },
      { state: 'India', value: 43 },
      { state: 'Maharashtra', value: 35 },
    ],
    stats: [
      { k: 'India’s women factory workers', v: '42% of them work in TN (6.3 of 14.9 lakh)' },
      { k: 'Women in TN construction', v: '34% — vs 9% national' },
    ],
    caveat: 'TN’s female labour-force participation (~40%) is above the national average but still has room to grow. The standout is the QUALITY and breadth of women’s work — factory floors and services, not just farm labour.',
    src: 'Annual Survey of Industries 2021-22; PLFS; TN State Planning Commission',
  },
  {
    id: 'industry', label: 'Industry & cities', icon: Factory,
    myth: '“No industry, just freebies.”',
    reality: 'TN is India’s most industrialised state and its most urbanised large state — the “Detroit of India,” #1 in number of factories, leading exporter of engineering goods, autos and electronics.',
    metric: 'Urban population share', unit: '% · Census 2011 · higher = more urbanised',
    bars: [
      { state: 'Tamil Nadu', value: 48.4, hi: true },
      { state: 'Maharashtra', value: 45.2 },
      { state: 'Gujarat', value: 42.6 },
      { state: 'Karnataka', value: 38.6 },
      { state: 'India', value: 31.1 },
      { state: 'Uttar Pradesh', value: 22.3 },
      { state: 'Bihar', value: 11.3 },
    ],
    stats: [
      { k: 'Manufacturing GDP', v: '11.9% of India’s — #1 in number of factories' },
      { k: 'MSMEs', v: '35.56 lakh Udyam-registered (2nd nationally)' },
    ],
    caveat: 'Maharashtra and Gujarat have larger single industrial hubs; TN’s edge is spread — industrial clusters across many districts (Coimbatore, Hosur, Tiruppur, Sriperumbudur), not one corridor.',
    src: 'TN Economic Survey 2024-25; Census 2011; ASI',
  },
];

function BarRow({ b, max, lowerBetter }: { b: Bar; max: number; lowerBetter?: boolean }) {
  const pct = Math.max(4, (b.value / max) * 100);
  return (
    <div className="flex items-center gap-2 py-1">
      <div className={`w-32 shrink-0 text-[12px] text-right ${b.hi ? 'text-orange-300 font-semibold' : 'text-gray-400'}`}>{b.state}</div>
      <div className="flex-1 h-5 bg-[#141414] rounded overflow-hidden">
        <div
          className={`h-full rounded ${b.hi ? 'bg-orange-500' : 'bg-sky-700/60'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`w-14 shrink-0 text-[12px] ${b.hi ? 'text-orange-300 font-bold' : 'text-gray-400'}`}>{b.value}</div>
    </div>
  );
}

export default function DravidianModel() {
  const [active, setActive] = useState(0);
  const s = SECTORS[active];
  const max = Math.max(...s.bars.map(b => b.value));

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="rounded-lg border border-orange-900/40 bg-orange-950/15 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-600 text-orange-50">MYTH-BUSTER</span>
          <span className="text-[11px] text-gray-500">TN vs other states · the data answers</span>
        </div>
        <p className="text-[13.5px] text-gray-300 leading-relaxed">
          The hater line — <span className="text-white">“Dravidian ideology ruined Tamil Nadu, it’s all freebies, no use”</span> —
          dies the moment you put TN next to other states on <span className="text-white">outcomes</span>. TN didn’t spend its way to
          ruin; it <span className="text-orange-300">invested in people</span> — schools, health, mid-day meals, social justice — and
          turned that into the human-development and growth dividend below. <span className="text-emerald-300">Welfare wasn’t the cost; it
          was the engine.</span>
        </p>
        <p className="text-[12px] text-gray-500 mt-2">
          Every number is from a neutral source (NFHS, AISHE, Census, RBI, PLFS). Where another state leads, we say so — because the
          honest case is the un-debunkable one.
        </p>
      </section>

      {/* Sector selector */}
      <div className="flex flex-wrap gap-2">
        {SECTORS.map((sec, i) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              onClick={() => setActive(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[12.5px] transition-colors ${
                i === active
                  ? 'border-orange-600 bg-orange-950/40 text-orange-200 font-medium'
                  : 'border-[#2a2a2a] bg-[#161616] text-gray-400 hover:text-white hover:border-[#3a3a3a]'
              }`}
            >
              <Icon size={14} /> {sec.label}
            </button>
          );
        })}
      </div>

      {/* Active sector panel */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        {/* myth vs reality */}
        <div className="grid md:grid-cols-2 gap-3 mb-5">
          <div className="rounded-md border border-red-900/40 bg-red-950/15 px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 mb-1">
              <TrendingDown size={12} /> THE MYTH
            </div>
            <p className="text-[13px] text-gray-300 italic">{s.myth}</p>
          </div>
          <div className="rounded-md border border-emerald-800/40 bg-emerald-950/15 px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 mb-1">
              <CheckCircle2 size={12} /> THE DATA
            </div>
            <p className="text-[13px] text-gray-200">{s.reality}</p>
          </div>
        </div>

        {/* Since-independence transformation strip */}
        {THEN_NOW[s.id] && (
          <div className="rounded-md border border-[#262626] bg-[#141414] px-3 py-2.5 mb-5">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              <History size={12} /> Since independence
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-[12.5px]">
              <span className="text-gray-400">
                <span className="text-gray-600">{THEN_NOW[s.id].era}: </span>{THEN_NOW[s.id].was}
              </span>
              <ArrowRight size={14} className="text-orange-500 shrink-0 hidden sm:block" />
              <span className="text-gray-200">
                <span className="text-orange-400 font-medium">Now: </span>{THEN_NOW[s.id].now}
              </span>
            </div>
          </div>
        )}

        {/* bar chart */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-semibold text-white">{s.metric}</div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1">
            {s.lowerBetter ? <TrendingDown size={12} /> : <TrendingUp size={12} />} {s.unit}
          </div>
        </div>
        <div className="mb-4">
          {[...s.bars].sort((a, b) => s.lowerBetter ? a.value - b.value : b.value - a.value).map(b => (
            <BarRow key={b.state} b={b} max={max} lowerBetter={s.lowerBetter} />
          ))}
        </div>

        {/* supporting stats */}
        {s.stats && (
          <div className="grid sm:grid-cols-2 gap-2 mb-4">
            {s.stats.map(st => (
              <div key={st.k} className="rounded-md border border-[#262626] bg-[#141414] px-3 py-2">
                <div className="text-[10.5px] text-gray-500 uppercase tracking-wide">{st.k}</div>
                <div className="text-[12.5px] text-gray-200 font-medium">{st.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* honest caveat */}
        <div className="rounded-md border border-amber-900/40 bg-amber-950/10 px-3 py-2.5 mb-2">
          <div className="flex gap-2 text-[12.5px] text-gray-300 leading-relaxed">
            <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span><span className="text-amber-300 font-medium">Honest caveat: </span>{s.caveat}</span>
          </div>
        </div>
        <div className="text-[10.5px] text-gray-600">Source: {s.src}</div>
      </section>

      {/* The synthesis — what makes it "the Dravidian model" */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
          <HandHeart size={15} className="text-orange-400" /> Why this is “the Dravidian model”
        </div>
        <p className="text-[13px] text-gray-300 leading-relaxed">
          One thread runs through every chart above: <span className="text-white">access was democratised.</span> Free, universal
          schooling and the mid-day meal (TN pioneered it — Kamaraj 1956, MGR universalised it 1982) kept poor and lower-caste
          children in school; 69% reservation carried them into colleges and jobs; a public-health network drove down infant deaths;
          and industrialisation pulled women onto factory floors. Each piece fed the next. <span className="text-emerald-300">That virtuous
          cycle — welfare → human capital → productivity → growth — IS the Dravidian model</span>, and it’s why a Dalit child or a working
          woman in TN has odds that exist almost nowhere else in India.
        </p>
      </section>

      {/* Bottom line */}
      <section className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
          <CheckCircle2 size={15} className="text-emerald-400" /> The honest bottom line
        </div>
        <p className="text-[13px] text-gray-300 leading-relaxed">
          “Dravidian rule ruined Tamil Nadu” is not an argument — it’s a slogan that no dataset supports. On income, education, health,
          social justice, women’s work and industry, TN is a <span className="text-white">consistent top performer, and the clear #1 large
          state on the metrics that matter for equity.</span> It isn’t #1 at literally everything — Kerala leads several health and literacy
          measures, Karnataka edges per-capita income — and we say so plainly. But no other <span className="text-white">large, diverse</span>
          state has combined this much growth, industry, welfare and caste/gender equity at once. That combination is the achievement.
        </p>
      </section>

      <p className="text-[11px] text-gray-600 leading-relaxed px-1">
        Sources: NFHS-5 (2019-21); AISHE 2021-22 (Ministry of Education); Census of India 2011; RBI Handbook of Statistics on Indian
        States 2024-25; PLFS; Annual Survey of Industries 2021-22; NITI Aayog; Tamil Nadu Economic Survey 2024-25. Framework:
        Kalaiyarasan A. &amp; M. Vijayabaskar, “The Dravidian Model” (Cambridge University Press, 2021).
      </p>
    </div>
  );
}
