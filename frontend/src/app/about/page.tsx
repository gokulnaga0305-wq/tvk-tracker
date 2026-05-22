import { Info, Github, Shield } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Info size={22} className="text-orange-400" />
          About TVK Files
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
          <h2 className="text-white font-semibold mb-2">What is this?</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            TVK Files is an independent fact-checking and accountability tracker for the
            Tamilaga Vettri Kazhagam (TVK) government in Tamil Nadu, which took office on
            May 11, 2026. It tracks incidents of corruption, crime, governance failures,
            broken promises, and — critically — cases where TVK claims credit for
            projects and schemes initiated by previous administrations.
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
          <h2 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Shield size={14} className="text-blue-400" />
            Methodology
          </h2>
          <ul className="text-gray-400 text-sm leading-relaxed space-y-2">
            <li>• Incidents are scraped from credible news sources (The Hindu, NDTV, Scroll, The Wire, TNM)</li>
            <li>• AI (Claude) extracts, categorizes, and assigns confidence scores</li>
            <li>• Incidents with AI confidence &lt; 75% go into a manual review queue</li>
            <li>• All published incidents link back to primary source URLs</li>
            <li>• Credit steal incidents include documentation of the original work</li>
          </ul>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
          <h2 className="text-white font-semibold mb-2">Data sources</h2>
          <div className="flex flex-wrap gap-2">
            {['The Hindu TN', 'NDTV Tamil Nadu', 'Scroll.in', 'The Wire', 'The News Minute',
              'NCRB Crime Data', 'TN Govt Portal', 'Twitter/X'].map(s => (
              <span key={s} className="text-xs bg-[#222] border border-[#333] text-gray-400 px-3 py-1 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
          <p className="text-gray-600 text-xs leading-relaxed">
            This platform is built for transparency and public accountability. It is not affiliated
            with any political party. All data is sourced from publicly available news reports and
            government records. If you believe an incident is incorrectly categorized or sourced,
            use the Report Issue button to flag it.
          </p>
        </div>
      </div>
    </div>
  );
}
