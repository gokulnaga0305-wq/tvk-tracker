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

      <Section icon={Database} title="10. Audit trail">
        <p>
          Every incident has a public audit log: when it was created, every status
          change, who approved it (AI vs admin), and any retraction reason. Click any
          incident card to see its full audit history.
        </p>
      </Section>

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
