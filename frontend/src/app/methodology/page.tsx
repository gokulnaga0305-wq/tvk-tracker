import { ShieldCheck, Database, Bot, Users, AlertTriangle, Copy, Image as ImageIcon, Activity } from 'lucide-react';

export const metadata = {
  title: 'Methodology — TVK Files',
};

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 mb-4">
      <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Icon size={16} className="text-orange-400" />
        {title}
      </h2>
      <div className="text-gray-400 text-sm leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <div className="flex-1 p-3 sm:p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck size={22} className="text-emerald-400" />
          Methodology
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          How we collect, verify, and publish incidents. Public, auditable, and challengeable.
        </p>
      </div>

      <Section icon={Database} title="1. Data sources">
        <p>
          We ingest from <strong className="text-white">21+ RSS feeds</strong> covering Tamil
          and English press, plus an authoritative <strong className="text-white">DMK
          archive</strong> of <strong className="text-white">2,564 items</strong> from
          dmk.in, @CMOTamilnadu (DMK era), and @TNDIPRNEWS.
        </p>
        <p>Sources are classified into credibility tiers:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><span className="text-green-400">Primary</span> — government data, court orders, RTI responses</li>
          <li><span className="text-blue-400">Established press</span> — The Hindu, NDTV, Indian Express, Vikatan, Dinamani, The Wire</li>
          <li><span className="text-cyan-400">Regional press</span> — Dinamalar, Maalai Malar, Theekkathir, Puthiya Thalaimurai</li>
          <li><span className="text-violet-400">Online native</span> — Scroll, NewsMinute, The Quint, The Print, Spark+</li>
          <li><span className="text-gray-500">Social media</span> — leads only, never the sole evidence for an incident</li>
        </ul>
      </Section>

      <Section icon={Bot} title="2. AI extraction & categorization">
        <p>
          Each scraped article is processed by <strong className="text-white">Claude Haiku
          4.5</strong> (via OpenRouter). The AI extracts: title, summary, category, location,
          date, severity (1-5), confidence (0-1), and any DMK schemes the article matches.
        </p>
        <p>
          The AI is instructed to judge relevance by <strong className="text-white">impact on Tamil
          Nadu citizens</strong> rather than just whether TVK is named — anything happening
          in TN after May 11, 2026 is the TVK government's responsibility.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="3. Multi-source verification gate">
        <p>
          An incident is auto-published only if <strong className="text-white">2+ independent
          outlets</strong> report the same event within 48 hours (we match on
          category + location + date). Single-source articles go to the
          <strong className="text-white"> admin verification queue</strong>.
        </p>
        <p>
          Verification states visible on every card:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li><span className="text-green-400">Verified · N sources</span> — confirmed by ≥2 outlets</li>
          <li><span className="text-emerald-400">Admin verified</span> — human reviewer approved</li>
          <li><span className="text-yellow-400">Single source</span> — pending cross-reference</li>
          <li><span className="text-red-400">Retracted</span> — proven incorrect, kept visible with strikethrough + reason (never deleted)</li>
        </ul>
      </Section>

      <Section icon={Copy} title="4. Credit-steal cross-reference">
        <p>
          When the AI flags an article as <em>credit stealing</em> (TVK claiming credit for
          a DMK-era scheme), the system searches our <strong className="text-white">2,564-item
          DMK archive</strong> for date-stamped precedents.
        </p>
        <p>
          Matches are scored 0–1:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>0.95</strong> — direct link to a scheme in our registry</li>
          <li><strong>0.85</strong> — archive item mentions scheme name or alias</li>
          <li><strong>0.25–0.7</strong> — keyword overlap (weaker signal)</li>
        </ul>
        <p className="text-gray-500 italic mt-2">
          Each incident card shows the precedents with date, source (@CMOTamilnadu /
          @TNDIPRNEWS / dmk.in), and a clickable link to the original.
        </p>
      </Section>

      <Section icon={ImageIcon} title="5. AI-generated image detection">
        <p>
          Articles containing images go through a HuggingFace open-source detector
          (<code className="text-orange-300 text-xs">Organika/sdxl-detector</code>).
          Images scoring above 0.6 AI-suspicion are flagged for admin review.
        </p>
        <p>
          <strong className="text-amber-300">We never auto-publish a "FAKE" verdict.</strong> Image
          flags only enter the admin queue — humans verify before any image is marked
          as fake on the public dashboard.
        </p>
      </Section>

      <Section icon={AlertTriangle} title="6. Fact-check cross-reference">
        <p>
          We query the <strong className="text-white">Google Fact Check Tools API</strong> for
          related debunks from AltNews, BOOM Live, Fact Crescendo, The Quint Webqoof,
          NewsMobile, etc. When matches are found, they're attached to the incident
          card as related fact-checks (in English and Tamil where available).
        </p>
      </Section>

      <Section icon={Users} title="7. Citizen reporting">
        <p>
          Anyone can submit a report via the <a href="/report" className="text-orange-400 hover:underline">Report
          page</a>. Submissions are rate-limited (5/hour per IP) and go through the
          same admin moderation queue before going live.
        </p>
      </Section>

      <Section icon={AlertTriangle} title="8. How to challenge an incident">
        <p>
          If you believe an incident is misreported or misclassified, click the
          <strong className="text-white"> Report Issue</strong> button on the dashboard
          and reference the incident's source URL. Verified errors result in
          <strong className="text-white"> retraction</strong> — the card stays visible
          with strikethrough text and a public reason. We never delete history.
        </p>
      </Section>

      <div id="incumbency-meter" className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 mb-4">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Activity size={16} className="text-orange-400" />
          9. Incumbency meter (0-100)
        </h2>
        <div className="text-gray-400 text-sm leading-relaxed space-y-2">
          <p>
            The Incumbency Meter is an <strong className="text-white">evidence-driven</strong>{' '}
            score, not an opinion poll. It starts at <strong className="text-white">50 (neutral)</strong>{' '}
            and shifts toward 0 (high anti-incumbency) or 100 (strong pro-incumbency) based on
            inputs we can all see and verify in this dashboard.
          </p>
          <p className="text-white font-semibold mt-3">Anti-incumbency pressures (push toward 0):</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>Baseline pressure (max 30 pts)</strong> — for every tracked category, compare the TVK-era incident rate to the DMK-era NCRB/govt baseline pro-rated to the same number of days. Each category over DMK pace adds anti-pressure scaled by an electoral-weight (murders & corruption weigh 5×, EB failures 2×).</li>
            <li><strong>Severity pressure (max 15 pts)</strong> — each verified severity 4-5 incident contributes 0.8 pts. A single major corruption scandal can move the meter before it shows up as a baseline-rate problem.</li>
            <li><strong>Promise-failure pressure (max 20 pts)</strong> — broken-promise ratio + the gap between promises kept and the expected delivery curve (~30% by year-1, scaling to ~70% by year-5).</li>
            <li><strong>Credit-steal pressure (max 5 pts)</strong> — each verified credit-stealing incident contributes 0.5 pts.</li>
            <li><strong>Rising trend (max 5 pts)</strong> — last 14 days vs prior 14 days. A 20%+ rise in incident rate adds pressure.</li>
          </ul>
          <p className="text-white font-semibold mt-3">Pro-incumbency boosts (push toward 100):</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>Promise delivery (max 20 pts)</strong> — kept-ratio × 20.</li>
            <li><strong>Baseline beats (max 15 pts)</strong> — +3 pts for each category measurably better than DMK pace.</li>
            <li><strong>Falling trend (max 3 pts)</strong> — declining incident rate over the last 14 days.</li>
          </ul>
          <p className="text-white font-semibold mt-3">Honeymoon softener (fades to 0 by day 100):</p>
          <p>
            New governments get the benefit of the doubt in their first 100 days. The meter
            includes a linearly-decaying buffer of up to +10 pts that disappears by day 100,
            after which full accountability mode kicks in.
          </p>
          <p className="mt-3 italic text-gray-500">
            Every input is queryable from the same DB the dashboard uses. The endpoint
            <code className="text-gray-300 bg-black/40 px-1 rounded ml-1">/api/stats/incumbency-meter</code>{' '}
            returns the score, zone, top driving factors, and the full numeric breakdown so
            anyone can audit how the number was reached. Refreshes every 5 minutes.
          </p>
        </div>
      </div>

      <div id="economic-baselines" className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 mb-4">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Database size={16} className="text-orange-400" />
          10. Sectoral economic baselines (DMK CAGR vs TVK)
        </h2>
        <div className="text-gray-400 text-sm leading-relaxed space-y-2">
          <p>
            DMK governed Tamil Nadu from May 2021 to May 2026 — a full five-year
            term. The state's economic record over that period is the most rigorous
            yardstick for evaluating TVK's regime, because GSDP and sectoral
            value-add data are published independently by MoSPI, the RBI, and
            the TN Finance Department.
          </p>
          <p>
            We track <strong className="text-white">17 sectoral metrics</strong> grouped
            into five buckets: Headline (total GSDP, per-capita NSDP),
            Agriculture, Industry (manufacturing, construction, electricity,
            mining), Services (trade, finance, public admin, other), and
            Investment & Trade (FDI, exports, tax revenue).
          </p>
          <p className="text-white font-semibold mt-3">DMK baseline = 5-year CAGR (FY22-FY26)</p>
          <p>
            For each metric we compute the compound annual growth rate over the
            DMK term using the official series. CAGR is the right anchor because
            it is unit-free, comparable across sectors of different sizes, and
            unaffected by base-effect distortions in any single year.
          </p>
          <p className="text-white font-semibold mt-3">TVK comparison = latest published quarterly observation</p>
          <p>
            As each new TN Economic Survey / RBI State Finances / MoSPI advance
            estimate is released, we ingest the observation into the
            <code className="text-gray-300 bg-black/40 px-1 rounded mx-1">economic_quarterly_data</code>
            table via an admin endpoint. The dashboard shows the most-recent
            observation per metric and the
            <strong className="text-white"> percentage-point delta (pp)</strong> vs
            the DMK CAGR. Ahead by 0.5pp+ = green ("ahead of DMK pace"), behind by
            0.5pp+ = red, between = yellow ("tracking").
          </p>
          <p className="text-white font-semibold mt-3">Sources cited per metric</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>TN Economic Survey 2025-26 (Finance Dept, Govt of Tamil Nadu)</li>
            <li>MoSPI State Domestic Product release, base year 2011-12</li>
            <li>RBI Handbook of Statistics on Indian States</li>
            <li>DPIIT FDI Quarterly Fact Sheet</li>
            <li>DGCI&S state-wise exports series</li>
            <li>TN Finance Dept Budget at a Glance + Revenue Receipts series</li>
          </ul>
          <p className="text-white font-semibold mt-3">Future meter integration</p>
          <p>
            Once we have at least three TVK quarterly observations, the
            Incumbency Meter will fold this into a dedicated
            <strong className="text-white"> economic-pressure component</strong>
            (cap ±20 pts) — if TVK underperforms DMK CAGR across most sectors,
            it adds anti-incumbency pressure proportional to the gap; outperforming
            adds pro-incumbency boost. Until then the meter remains crime/governance-only
            so it doesn't over-state confidence.
          </p>
        </div>
      </div>

      <Section icon={Database} title="11. Audit trail">
        <p>
          Every incident has a public audit log: when it was created, every status
          change, who approved it (AI vs admin), and any retraction reason. Click any
          incident card to see its full audit history.
        </p>
      </Section>

      {/* Radical-transparency block: pre-empt the informed critic by naming
          our own limitations BEFORE they do. A tracker that states its biases
          is more trustworthy than one that pretends to be neutral. */}
      <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-5 mb-4">
        <h2 className="text-amber-200 font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          12. Limitations &amp; known biases (read this)
        </h2>
        <div className="text-gray-300 text-sm leading-relaxed space-y-3">
          <p>
            We hold ourselves to the same standard we ask of the government.
            Here is where this tracker is weak — stated plainly, so you can
            judge it honestly:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong className="text-white">Counts are not rates.</strong> A raw
              total ("23 incidents") grows just because time passes. Wherever
              possible we show a <em>per-month</em> figure and a{' '}
              <strong className="text-white">DMK-era baseline</strong> next to it —
              because "compared to what?" is the only honest question. Numbers
              without a baseline are context, not proof.
            </li>
            <li>
              <strong className="text-white">Correlation is not causation.</strong>{' '}
              An incident happening under a government does not prove the
              government caused it. A murder is a law-and-order data point, not
              automatically a policy failure. We tag responsibility only where a
              specific decision or named actor is involved; otherwise it is
              context for the law-and-order trend, nothing more.
            </li>
            <li>
              <strong className="text-white">Reporting bias.</strong> We can only
              track what the press reports. More media attention can inflate a
              category's count without the underlying reality changing. Sparse
              coverage of a district ≠ peace there.
            </li>
            <li>
              <strong className="text-white">Source asymmetry.</strong> Our feeds
              skew toward outlets that cover TVK critically. We label every
              incident's source tier (verified / press-reported / single-source)
              so you can weight it yourself, and single social-media posts never
              stand alone as evidence.
            </li>
            <li>
              <strong className="text-white">We have a point of view.</strong> This
              project is run by people who want accountability for the TVK
              government. We fight that bias with public sources, a 2-outlet
              verification rule, a public corrections log, and by recording the
              government's <em>wins</em> too — but you should read everything here
              knowing the people behind it are not neutral observers.
            </li>
            <li>
              <strong className="text-white">Economic credit is shared.</strong> No
              single government "creates" growth. State GDP reflects decades of
              human-capital investment, geography, entrepreneurs, and central
              macro-policy. We show baselines and per-capita figures rather than
              claiming any one administration's sole credit.
            </li>
          </ul>
          <p className="text-amber-200/80">
            If you find an error, a missing baseline, or an unfair attribution —
            tell us via the Report page. Corrections are logged publicly.
          </p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 mt-6 text-center">
        <p className="text-gray-500 text-xs leading-relaxed">
          This platform is built for transparency. We track signal, not noise. We
          attribute credit accurately. We retract when wrong. We show our sources.
        </p>
        <p className="text-gray-700 text-xs mt-2">
          Source code:{' '}
          <a
            href="https://github.com/gokulnaga0305-wq/tvk-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:underline"
          >
            github.com/gokulnaga0305-wq/tvk-tracker
          </a>
        </p>
      </div>
    </div>
  );
}
