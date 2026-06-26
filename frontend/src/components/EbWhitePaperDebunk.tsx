'use client';
/**
 * EB White Paper debunk — the TVK government released a white paper (25 Jun 2026)
 * to prove the DMK "ruined" the electricity board (₹2.47L cr debt). Its OWN
 * tables show the opposite: the annual operating deficit collapsed 94% under DMK
 * and the utility is projected to turn a surplus. The honest line: read the FLOW
 * (annual deficit), not just the STOCK (cumulative debt).
 *
 * Every figure is from the primary document — "Energy Department White Paper,
 * 25.06.2026" (consolidated TNEB, 4 companies). Honest caveats stated plainly:
 * revenue growth includes tariff + subsidy; debt did rise; 2025-26 is an RE.
 */
import { ScrollText, TrendingDown, CheckCircle2, AlertTriangle, Info, ArrowRight } from 'lucide-react';

// Annual deficit, each government's FINAL year (white paper p.5 / p.34). The
// collapse from −14,542 (AIADMK's last) to −933 (DMK's last) is the whole story.
const DEFICIT = [
  { y: '2010-11', gov: 'DMK', v: -12669 },
  { y: '2015-16', gov: 'AIADMK', v: -6054 },
  { y: '2020-21', gov: 'AIADMK last', v: -14542, hi: true },
  { y: '2025-26', gov: 'DMK last', v: -933, hi: true },
  { y: '2026-27', gov: 'TVK proj.', v: 1673, surplus: true },
];
const MAXMAG = 14542;

// 5-year block deficit (p.4) — DMK 2021-26 is the lowest in 20 years.
const BLOCKS = [
  { p: '2006-11', v: -35463 },
  { p: '2011-16', v: -56361 },
  { p: '2016-21', v: -58534, hi: true },
  { p: '2021-26', v: -34447, tn: true },
];
const MAXB = 58534;

export default function EbWhitePaperDebunk() {
  return (
    <div className="rounded-lg border border-amber-900/40 bg-amber-950/12 p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <ScrollText size={18} className="text-amber-400" />
        <h2 className="text-base font-bold text-white">The EB white paper (25 Jun 2026) — read the flow, not just the stock</h2>
      </div>
      <p className="text-[12.5px] text-gray-400 leading-relaxed mb-4 max-w-3xl">
        The TVK government released this to prove the DMK &ldquo;ruined&rdquo; the electricity board with ₹2.47 lakh crore of
        debt. But the document&rsquo;s <span className="text-gray-200">own tables</span> show the annual operating deficit was
        nearly <span className="text-gray-200">wiped out</span> under the DMK — and the utility is now projected to turn a surplus.
      </p>

      {/* THE deficit-collapse chart */}
      <div className="rounded-md border border-[#262626] bg-[#141414] p-4 mb-3">
        <div className="text-[13px] font-semibold text-gray-200 mb-1">Annual EB deficit — each government&rsquo;s final year</div>
        <div className="text-[11px] text-gray-500 mb-3">₹ crore. Red = deficit, green = surplus. Shorter is better.</div>
        <div className="space-y-2">
          {DEFICIT.map((d) => {
            const mag = Math.abs(d.v);
            return (
              <div key={d.y} className="flex items-center gap-2">
                <div className="w-24 shrink-0 text-right">
                  <span className={`text-[12px] ${d.hi || d.surplus ? 'text-gray-200 font-semibold' : 'text-gray-400'}`}>{d.y}</span>
                  <div className="text-[10px] text-gray-600">{d.gov}</div>
                </div>
                <div className="flex-1 h-6 rounded bg-[#0d0d0d] overflow-hidden">
                  <div className={`h-full rounded ${d.surplus ? 'bg-emerald-500' : d.v === -933 ? 'bg-amber-500' : 'bg-rose-600/70'}`}
                       style={{ width: `${Math.max((mag / MAXMAG) * 100, 4)}%` }} />
                </div>
                <div className={`w-20 shrink-0 text-[12px] tabular-nums ${d.surplus ? 'text-emerald-300 font-semibold' : d.v === -933 ? 'text-amber-300 font-semibold' : 'text-gray-400'}`}>
                  {d.v > 0 ? '+' : '−'}{mag.toLocaleString('en-IN')}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[12.5px] text-gray-300 mt-3 leading-relaxed">
          The deficit fell from <span className="text-rose-300">₹14,542 cr (2020-21)</span> to
          <span className="text-amber-300"> ₹933 cr (2025-26)</span> — a <span className="text-white">94% cut</span>, taking cost
          recovery from <span className="text-white">80% → 99.2%</span>. The TVK government&rsquo;s own 2026-27 budget then projects
          a <span className="text-emerald-300">₹1,673 cr surplus</span>. DMK handed over a utility on the cusp of profitability.
        </p>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <div className="rounded-md border border-[#262626] bg-[#141414] p-3">
          <div className="text-[11px] text-gray-500">5-yr deficit, DMK 2021-26</div>
          <div className="text-xl font-bold text-emerald-300">₹34,447 cr</div>
          <div className="text-[11px] text-gray-500">lowest in 20 yrs · 41% below AIADMK&rsquo;s ₹58,534 cr</div>
        </div>
        <div className="rounded-md border border-[#262626] bg-[#141414] p-3">
          <div className="text-[11px] text-gray-500">Cost recovery (2025-26)</div>
          <div className="text-xl font-bold text-emerald-300">99.2%</div>
          <div className="text-[11px] text-gray-500">up from 80% in 2020-21</div>
        </div>
        <div className="rounded-md border border-[#262626] bg-[#141414] p-3">
          <div className="text-[11px] text-gray-500">Distribution transformers added</div>
          <div className="text-xl font-bold text-emerald-300">99,573</div>
          <div className="text-[11px] text-gray-500">2021-26 — the most of any 5-yr block</div>
        </div>
      </div>

      {/* stock vs flow explainer */}
      <div className="rounded-md border border-sky-900/40 bg-sky-950/12 p-4 mb-3">
        <div className="text-[13px] font-semibold text-white mb-2">The trick: brandish the STOCK, bury the FLOW</div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="rounded bg-[#141414] border border-[#2a2a2a] p-3 text-center">
            <div className="text-[12px] text-rose-300 font-semibold">DEBT (stock) ₹2.47L cr</div>
            <div className="text-[11px] text-gray-500">cumulative — funds decades of legacy losses + capex (incl. AIADMK&rsquo;s UDAY, 2017)</div>
          </div>
          <ArrowRight size={16} className="text-gray-600 mx-auto rotate-90 sm:rotate-0" />
          <div className="rounded bg-[#141414] border border-[#2a2a2a] p-3 text-center">
            <div className="text-[12px] text-emerald-300 font-semibold">DEFICIT (flow) −94%</div>
            <div className="text-[11px] text-gray-500">the annual operating gap — the real test of management — nearly eliminated</div>
          </div>
        </div>
        <p className="text-[12px] text-gray-400 mt-2">The white paper quotes the scary cumulative debt while hiding that the annual performance had its best run in 25 years. A bigger mortgage taken to fix a leaking house isn&rsquo;t the same as the house leaking more.</p>
      </div>

      {/* honest caveats */}
      <div className="rounded-md border border-amber-900/40 bg-amber-950/15 px-4 py-3">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-200 mb-1.5"><AlertTriangle size={14} /> What we don&rsquo;t overclaim</div>
        <ul className="space-y-1 text-[12px] text-gray-300 leading-relaxed">
          <li>· Not literally profitable in 2025-26 — still a <span className="text-gray-200">₹933 cr gap</span> (surplus is a 2026-27 <span className="text-gray-200">projection</span>).</li>
          <li>· The deficit cut isn&rsquo;t pure efficiency — revenue doubled partly via <span className="text-gray-200">tariff true-ups + state subsidy</span>; consumers and the budget carried some load. (Still, 99% cost recovery is what good discom management looks like.)</li>
          <li>· <span className="text-gray-200">Debt did rise</span> (₹87,399 cr borrowed 2021-26) — real; but it&rsquo;s a stock financing legacy losses, not the annual flow.</li>
          <li>· 2025-26 is a <span className="text-gray-200">Revised Estimate</span>, not audited actuals; and EB staffing (65,921 vacancies) is a genuine weakness.</li>
        </ul>
      </div>

      <p className="text-[10px] text-gray-600 leading-relaxed mt-2">
        Source: Energy Department White Paper, Government of Tamil Nadu, 25.06.2026 (Consolidated TNEB — 4 companies; revenue/
        expenditure pp. 4-5 &amp; 34, debt p. 6, infrastructure p. 34, 2026-27 budget p. 36). All figures are the white paper&rsquo;s
        own. &ldquo;Deficit&rdquo; = revenue receipt − expenditure (the flow); &ldquo;debt&rdquo; = cumulative borrowings (the stock).
      </p>
    </div>
  );
}
