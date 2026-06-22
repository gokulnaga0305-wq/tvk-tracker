'use client';
/**
 * NCRB "Crime in India" — the comprehensive crime baseline for the DMK term.
 * The dashboard's crime stat cards are a press-reported SAMPLE; this is the
 * official census. NCRB publishes annually and the latest with state tables is
 * Crime in India 2023 (released 29 Sep 2025) — so the published window covering
 * the DMK government is 2021-2023 (2024-2026 are not out yet).
 *
 * Honest by design: TN's high OVERALL rate is registration-driven (a transparency
 * signal, not a crime signal), while TN's crimes-against-women rate is ~⅓ the
 * national rate. Where there's a real concern (falling conviction rate) we say so.
 *
 * Every figure is VERIFIED against NCRB primary tables / a Rajya Sabha annexure
 * reproducing NCRB / established press citing NCRB. Unverified figures (TN
 * murder/rape per-lakh, 2022 charge-sheet/conviction) are deliberately omitted.
 */
import { Scale, ShieldCheck, AlertTriangle, Info } from 'lucide-react';

// VERIFIED year-by-year. '—' = not published / not yet verified to a hard number.
const YEARS = ['2021', '2022', '2023'] as const;
const TN = {
  total:     { '2021': '7,56,753', '2022': '4,73,456', '2023': '5,39,651' },
  rate:      { '2021': '989.5',    '2022': '617.2',    '2023': '701.4' },
  caw:       { '2021': '8,501',    '2022': '9,207',    '2023': '8,943' },
  cawRate:   { '2021': 22.2,       '2022': 24.0,       '2023': 23.2 },
  chargeSheet:{ '2021': '63.0%',   '2022': '70.7%',    '2023': '85.7%' },  // IPC basis
  conviction:{ '2021': '73.3%',    '2022': '56.0%',    '2023': '58.5%' },  // IPC basis
  rank:      { '2021': '4th',      '2022': '5th',      '2023': '3rd' },
};
const INDIA_CAW_RATE = { '2021': 64.5, '2022': 66.4, '2023': 66.2 };

// Serious-crime rates per lakh population (2023, read from NCRB primary tables
// 2A.1 / 1A.4 / 1C.1) — TN vs national. Rape & violent crime are well below the
// national rate; murder is about average (honest — not overclaimed).
const SERIOUS = [
  { k: 'Murder', tn: 2.2, india: 2.0, count: '1,681', note: '≈ national average' },
  { k: 'Rape', tn: 0.9, india: 4.4, count: '365', note: '≈ ⅕ the national rate' },
  { k: 'Violent crime', tn: 14.7, india: 31.2, count: '11,302', note: '≈ half the national rate' },
];

export default function CrimeDataNCRB() {
  const maxRate = 70; // for the CAW-rate bars
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <Scale size={18} className="text-violet-400" />
        <h2 className="text-lg font-bold text-white">Law &amp; order — the NCRB record (2021–2023)</h2>
      </div>
      <p className="text-[12.5px] text-gray-400 leading-relaxed mb-4 max-w-3xl">
        The crime cards above are a press-reported <span className="text-gray-300">sample</span>. This is the official
        <span className="text-gray-300"> census</span> — NCRB&rsquo;s &ldquo;Crime in India.&rdquo; The latest edition with state
        tables is <span className="text-gray-300">2023</span> (released Sep 2025), so the published window for the DMK term is
        2021–2023. Read the headline rate carefully — for a populous, high-registration state it measures <span className="text-gray-300">how
        thoroughly crime is recorded</span> as much as how much occurs.
      </p>

      {/* Headline contrast cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/15 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/80 uppercase tracking-wide mb-1">
            <ShieldCheck size={13} /> Crimes vs women (rate)
          </div>
          <div className="text-2xl font-bold text-emerald-300">23.2 <span className="text-sm text-gray-500">/ lakh</span></div>
          <div className="text-[12px] text-gray-400 mt-1">vs <span className="text-gray-200">national 66.2</span> — about <span className="text-emerald-300">⅓</span> the all-India rate (2023). TN&rsquo;s strongest safety stat.</div>
        </div>
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Charge-sheeting rate</div>
          <div className="text-2xl font-bold text-sky-300">85.7%</div>
          <div className="text-[12px] text-gray-400 mt-1">well above national <span className="text-gray-200">72.7%</span> (2023) — police actually file cases.</div>
        </div>
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/12 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300/80 uppercase tracking-wide mb-1">
            <AlertTriangle size={13} /> The honest concern
          </div>
          <div className="text-2xl font-bold text-amber-300">73.3% → 58.5%</div>
          <div className="text-[12px] text-gray-400 mt-1">IPC <span className="text-gray-200">conviction rate fell</span> (2021→2023). A real gap, not a reporting artefact.</div>
        </div>
      </div>

      {/* Year-by-year table */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden mb-4">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-[#141414] text-gray-500">
              <th className="text-left font-medium px-3 py-2">Tamil Nadu</th>
              {YEARS.map((y) => <th key={y} className="text-right font-medium px-3 py-2">{y}</th>)}
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {[
              ['Total cognizable crimes', TN.total],
              ['Crime rate / lakh', TN.rate],
              ['Crimes against women', TN.caw],
              ['Charge-sheeting rate (IPC)', TN.chargeSheet],
              ['Conviction rate (IPC)', TN.conviction],
              ['Rank by crime rate', TN.rank],
            ].map(([label, row]) => (
              <tr key={label as string} className="border-t border-[#222]">
                <td className="px-3 py-2 text-gray-400">{label as string}</td>
                {YEARS.map((y) => (
                  <td key={y} className="px-3 py-2 text-right font-medium tabular-nums">{(row as Record<string, string>)[y]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Serious crime — TN vs national (2023, per lakh) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {SERIOUS.map((s) => (
          <div key={s.k} className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">{s.k} rate · 2023</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-200 tabular-nums">{s.tn}</span>
              <span className="text-[11px] text-gray-500">/ lakh · {s.count} cases</span>
            </div>
            <div className="text-[12px] text-gray-400 mt-1">National <span className="tabular-nums">{s.india}</span> — <span className="text-gray-300">{s.note}</span></div>
          </div>
        ))}
      </div>

      {/* CAW rate vs national — visual */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 mb-4">
        <div className="text-[12.5px] font-semibold text-white mb-3">Crimes against women — rate per lakh women: TN vs India</div>
        <div className="space-y-3">
          {YEARS.map((y) => (
            <div key={y} className="flex items-center gap-3">
              <span className="w-9 text-[11px] text-gray-500">{y}</span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 rounded bg-emerald-500/70" style={{ width: `${(TN.cawRate[y] / maxRate) * 100}%` }} />
                  <span className="text-[11px] text-emerald-300">TN {TN.cawRate[y]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 rounded bg-gray-600/60" style={{ width: `${(INDIA_CAW_RATE[y] / maxRate) * 100}%` }} />
                  <span className="text-[11px] text-gray-400">India {INDIA_CAW_RATE[y]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Honest framing */}
      <div className="rounded-md border border-[#262626] bg-[#141414] px-4 py-3">
        <div className="flex gap-2 text-[12px] text-gray-400 leading-relaxed">
          <Info size={14} className="text-violet-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p>
              <span className="text-gray-200">Why TN&rsquo;s overall rate looks high:</span> it&rsquo;s driven by Special &amp; Local
              Laws and <span className="text-gray-300">thorough FIR registration</span> — experts note southern states record
              more completely, so &ldquo;more cases&rdquo; often means &ldquo;more reporting,&rdquo; not more crime. TN&rsquo;s violent
              crime is comparatively low and its charge-sheeting is among the best.
            </p>
            <p>
              <span className="text-gray-200">What we don&rsquo;t hide:</span> the IPC conviction rate fell sharply (73.3%→56.0% in
              2022, partly recovering to 58.5%) — a genuine problem, even as charge-sheeting rose (63%→85.7%). And TN&rsquo;s
              murder rate (2.2) sits ≈ the national average, so we don&rsquo;t claim TN is uniformly &ldquo;safe.&rdquo; <span className="text-gray-200">Two traps we avoid:</span> 2020 (rate ~1,809) was a COVID
              lockdown-violation anomaly — the clean trend starts 2021; and the &ldquo;86.1&rdquo; CAW figure some posts pin on TN
              is actually <span className="text-gray-300">Kerala&rsquo;s</span> — TN&rsquo;s is 23.2.
            </p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-600 leading-relaxed mt-2">
        Source: NCRB &ldquo;Crime in India&rdquo; 2021 / 2022 / 2023 (ncrb.gov.in), read from primary state tables (2A.1, 1A.4,
        1C.1, 17A.2, 18A.2) + a Rajya Sabha annexure reproducing NCRB; registration caveat per Outlook India &amp; NCRB&rsquo;s
        own framing. Charge-sheeting &amp; conviction are on the IPC-crime basis; serious-crime rates are per lakh population
        (2023). NCRB 2024–2026 state tables are not yet published — figures stop at 2023.
      </p>
    </div>
  );
}
