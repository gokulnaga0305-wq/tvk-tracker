'use client';
import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, AlertTriangle, FileText, ExternalLink } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CagFinding {
  key: string;
  label: string;
  value: string;
  trend: 'down' | 'flat' | 'bad';
  detail: string;
  report: string;
}
interface CagResponse {
  source_report: string;
  source_url: string;
  findings: CagFinding[];
}

/**
 * CagFindings — official CAG (Comptroller & Auditor General) audit findings
 * for the DMK tenure (FY 2022-23 State Finances Audit Report).
 *
 * Why it matters: unlike the crime/incident counts (which are a PRESS SAMPLE),
 * CAG figures are official, quotable totals from a constitutional auditor. This
 * is the most defensible accountability data on the dashboard — no
 * sample-vs-census caveat, every number traceable to a tabled report.
 *
 * 'down' = an improvement (e.g. deficit fell); 'bad' = a flagged problem;
 * 'flat' = essentially unchanged.
 */
export default function CagFindings() {
  const [data, setData] = useState<CagResponse | null>(null);

  useEffect(() => {
    fetch(`${API}/api/baselines/cag`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data || !data.findings?.length) return null;

  const trendIcon = (t: string) => {
    if (t === 'down') return <TrendingDown size={13} className="text-emerald-400" />;
    if (t === 'bad') return <AlertTriangle size={13} className="text-red-400" />;
    return <Minus size={13} className="text-gray-400" />;
  };
  const valueColor = (t: string) =>
    t === 'down' ? 'text-emerald-400' : t === 'bad' ? 'text-red-400' : 'text-gray-300';

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <FileText size={14} className="text-amber-400" />
          CAG Audit Findings
          <span className="text-gray-600 text-xs font-normal">
            (official audit — not press-sampled)
          </span>
        </h2>
        <a
          href={data.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-amber-400 flex items-center gap-1"
        >
          Read the report <ExternalLink size={11} />
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.findings.map(f => (
          <div
            key={f.key}
            className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 flex flex-col"
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-500 mb-1">
              {trendIcon(f.trend)} {f.label}
            </div>
            <div className={`text-2xl font-bold mb-2 ${valueColor(f.trend)}`}>{f.value}</div>
            <p className="text-[11px] text-gray-400 leading-relaxed flex-1">{f.detail}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-gray-500 mt-2">
        Source: {data.source_report}. These are official figures from the
        constitutional auditor — directly quotable, with no sample-vs-census
        caveat that the incident counts carry.
      </p>
    </section>
  );
}
