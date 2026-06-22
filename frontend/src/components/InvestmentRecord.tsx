'use client';
/**
 * Investment: MoUs → reality. The Dravidian-model claim that gets attacked most
 * is "all those MoUs never convert." This section meets it head-on with the
 * DMK government's own 2021-26 record (the Feb-2026 "Conversion Conclave"),
 * honestly hedged, set against the cross-state norm — and then contrasts it
 * with the manufactured "TVK investment win" fakes YouTurn has debunked.
 *
 * Sources: ANI (Conversion Conclave, 12 Feb 2026), TN Interim Budget 2026-27
 * (DT Next), ThePrint (Karnataka 31%, UP ~⅓), Policy Circle (Rajasthan <10%),
 * Outlook/National Herald (Gujarat ~68% self-claimed, disputed). Fakes:
 * youturn.in. Every government figure is flagged self-reported / unaudited.
 */
import { Building2, CheckCircle2, AlertTriangle, XCircle, ExternalLink, TrendingUp } from 'lucide-react';

// Cross-state MoU conversion. NOTE: the bars are NOT a like-for-like ranking —
// each state reports a different stage (TN 'operational' is a tougher bar than
// UP 'groundbreaking'); the caption says so.
const STATES = [
  { s: 'Tamil Nadu', v: 35, label: '~35% operational', hi: true, note: 'DMK 2021-26 (self-reported)' },
  { s: 'Gujarat', v: 68, label: '~68% commissioned', hi: false, note: 'self-claimed, disputed; ~29% had no status reported' },
  { s: 'Karnataka', v: 31, label: '31% implemented', hi: false, note: '38 of 122 projects (2018-23)' },
  { s: 'Uttar Pradesh', v: 33, label: '~⅓ groundbreaking', hi: false, note: 'a weaker bar than operational' },
  { s: 'Rajasthan', v: 9, label: '<10% implemented', hi: false, note: 'industry-body estimate (2022)' },
];

const NUMBERS = [
  { k: 'MoUs signed (2021-26)', v: '1,130+', sub: '1,179 total per the Interim Budget' },
  { k: 'Committed investment', v: '₹10.4L cr', sub: '₹12.37L cr total committed' },
  { k: 'Already operational', v: '35.1%', sub: 'govt figure — self-reported' },
  { k: 'Jobs created', v: '29.6 lakh', sub: 'EPFO data (36.5 lakh projected)' },
];

const FAKES = [
  {
    claim: 'A brand-new Saint-Gobain investment MoU, won by the TVK government',
    truth: 'It was a TWO-YEAR-OLD (DMK-era) Saint-Gobain MoU, re-presented as new.',
    reach: '2,491', url: 'https://youturn.in/two-years-old-saint-gobain-investment-mou-falsely-claimed-as-new-one-',
  },
  {
    claim: 'The ₹38,000 cr Thoothukudi Hyundai (HD KSOE) shipyard MoU was signed under TVK',
    truth: 'The HD Hyundai MoU was signed under the DMK government in 2025.',
    reach: '178', url: 'https://youturn.in/falsely-spread-that-thoothukudi-hyundai-shipyard-mou-signed-under-tvk-regime-',
  },
  {
    claim: 'The new TVK government cancelled the smart-meter tender to the Adani group',
    truth: 'False — no such cancellation by the TVK government; the claim misrepresents the tender.',
    reach: '162', url: 'https://youturn.in/falsely-spread-smart-meter-tender-to-adani-group-cancelled-by-tvk-regime-',
  },
];

export default function InvestmentRecord() {
  const maxV = 70;
  return (
    <div className="space-y-5 mt-8">
      <div className="flex items-center gap-2">
        <Building2 size={20} className="text-sky-400" />
        <h2 className="text-lg font-bold text-white">Investment: do the MoUs actually convert?</h2>
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed -mt-2">
        The sharpest attack on any &ldquo;investment summit&rdquo; record is that MoUs are just paper. So the DMK government did
        something unusual: in <span className="text-gray-200">February 2026 it held a dedicated &ldquo;Conversion Conclave&rdquo;</span> to
        put a number on how many of its MoUs had actually become real, operational projects. Here&rsquo;s that record — honestly
        hedged — and how it stacks up.
      </p>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {NUMBERS.map((n) => (
          <div key={n.k} className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
            <div className="text-2xl font-bold text-sky-300">{n.v}</div>
            <div className="text-[12px] text-gray-300 mt-0.5 leading-snug">{n.k}</div>
            <div className="text-[10.5px] text-gray-600 mt-1">{n.sub}</div>
          </div>
        ))}
      </div>

      {/* Cross-state conversion bars */}
      <section className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <TrendingUp size={15} className="text-emerald-400" /> MoU conversion vs other states
        </div>
        <p className="text-[12px] text-gray-500 mb-4">
          Most states never even publish a conversion number. Among those that do, TN&rsquo;s ~35% <span className="text-gray-300">operational</span> is
          at the strong end.
        </p>
        <div className="space-y-2.5">
          {STATES.map((st) => (
            <div key={st.s} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-[12px] text-gray-300 text-right">{st.s}</div>
              <div className="flex-1 h-6 rounded bg-[#141414] overflow-hidden relative">
                <div
                  className={`h-full rounded ${st.hi ? 'bg-sky-500/70' : 'bg-gray-600/50'}`}
                  style={{ width: `${(st.v / maxV) * 100}%` }}
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-white">{st.label}</span>
              </div>
              <div className="w-44 shrink-0 text-[10.5px] text-gray-600 leading-tight">{st.note}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
          <span className="text-amber-400/90">Not a clean ranking:</span> each state reports a different stage — TN&rsquo;s
          &ldquo;operational&rdquo; is a tougher bar than UP&rsquo;s &ldquo;groundbreaking&rdquo;, and Gujarat&rsquo;s ~68% is a
          self-claimed figure where ~29% of projects had no status reported at all. Read it as &ldquo;TN is at the strong end of
          the Indian range,&rdquo; not an exact rank.
        </p>
      </section>

      {/* TN industrial standing + honest hedges */}
      <div className="grid md:grid-cols-2 gap-3">
        <section className="rounded-lg border border-emerald-900/40 bg-emerald-950/12 p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-200 mb-2">
            <CheckCircle2 size={15} className="text-emerald-400" /> Why the inflow is credible
          </div>
          <ul className="space-y-1.5 text-[12px] text-gray-300 leading-relaxed">
            <li>· Most factories of any state in India</li>
            <li>· 2nd-largest state economy (GSDP ~₹31 lakh cr)</li>
            <li>· ~41% of India&rsquo;s electronics exports</li>
            <li>· Manufacturing grew ~14.7% real in 2024-25 (vs ~4.5% all-India)</li>
          </ul>
          <p className="text-[11px] text-gray-500 mt-2">For a base this large, a big MoU pipeline is consistent with structure, not a fluke.</p>
        </section>
        <section className="rounded-lg border border-amber-900/40 bg-amber-950/12 p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-200 mb-2">
            <AlertTriangle size={15} className="text-amber-400" /> What we DON&rsquo;T overclaim
          </div>
          <ul className="space-y-1.5 text-[12px] text-gray-300 leading-relaxed">
            <li>· The 35% is the govt&rsquo;s own figure — <span className="text-gray-200">not independently/CAG audited</span></li>
            <li>· MoU values &amp; jobs are <span className="text-gray-200">committed/projected</span>, not realised GVA or payroll</li>
            <li>· &ldquo;No other state has done this&rdquo; is rhetoric — Karnataka &amp; UP disclose conversion too; TN&rsquo;s distinction is the dedicated event</li>
            <li>· Some investment would have come anyway given TN&rsquo;s base</li>
          </ul>
        </section>
      </div>

      {/* Contrast: the manufactured TVK investment-win fakes */}
      <section className="rounded-lg border border-rose-900/40 bg-rose-950/12 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <XCircle size={15} className="text-rose-400" /> Meanwhile — the &ldquo;TVK investment wins&rdquo; that were fakes
        </div>
        <p className="text-[12px] text-gray-500 mb-4">
          Set the audited-ish DMK record against how the <span className="text-gray-300">other side manufactures</span> investment
          wins. Each of these was debunked by the fact-checker <span className="text-gray-300">YouTurn</span>.
        </p>
        <div className="space-y-2.5">
          {FAKES.map((f) => (
            <div key={f.url} className="rounded-md border border-[#262626] bg-[#141414] px-3 py-3">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-200 shrink-0 mt-0.5">FAKE</span>
                <div className="flex-1">
                  <div className="text-[12.5px] text-gray-300 leading-snug">&ldquo;{f.claim}&rdquo;</div>
                  <div className="text-[12.5px] text-emerald-300/90 leading-snug mt-1">→ {f.truth}</div>
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-[10.5px] text-gray-500 hover:text-sky-400 mt-1.5">
                    YouTurn debunk · {f.reach} views <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-600 mt-3">
          The asymmetry is the point: the DMK had to <span className="text-gray-400">earn</span> its conversion number at a public
          conclave; the &ldquo;TVK wins&rdquo; were old MoUs re-dated and tenders that were never cancelled.
        </p>
      </section>

      <p className="text-[10px] text-gray-600 leading-relaxed">
        Sources: ANI &amp; DT Next (Conversion Conclave, 12 Feb 2026; 35.11% operational, 73.5%/82.5% converted, 1,179 MoUs /
        ₹12.37 lakh cr) · TN Interim Budget 2026-27 · ThePrint (Karnataka 31% implemented; UP ~⅓ on the ground) · Policy Circle
        (Rajasthan &lt;10%) · Outlook Business &amp; National Herald (Gujarat ~68% self-claimed, disputed) · jobs created 29.63
        lakh per EPFO. Fakes debunked by youturn.in. All government conversion/jobs figures are self-reported and not
        independently audited.
      </p>
    </div>
  );
}
