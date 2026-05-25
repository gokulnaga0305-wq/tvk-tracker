'use client';
import { useEffect, useState } from 'react';
import { Activity, TrendingDown, TrendingUp, Clock } from 'lucide-react';

/**
 * IncumbencyMeter — realtime 0-100 score summarising whether the verified
 * evidence in our DB leans anti-incumbent (low) or pro-incumbent (high).
 *
 * Pure consumer of /api/stats/incumbency-meter. Fetches on mount, then
 * polls every 5 minutes so the meter updates without a page reload as
 * new incidents stream in from the Apify scrapers + corroboration sweep.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface MeterFactor {
  key: string;
  points: number;
  direction: 'anti' | 'pro';
  label: string;
}

interface MeterResponse {
  score: number;
  zone: 'high_anti' | 'elevated_anti' | 'contested' | 'mild_pro' | 'strong_pro';
  zone_label: string;
  govt_day: number;
  govt_name: string;
  anti_pressure_total: number;
  pro_boost_total: number;
  honeymoon_softener: number;
  factors: MeterFactor[];
  breakdown: Record<string, number>;
  raw_inputs: Record<string, number>;
}

// Zone styling. Each zone gets its own card chrome + needle color so the
// meter's "mood" is readable at a glance even before the user looks at the
// number itself.
const ZONE_STYLE: Record<MeterResponse['zone'], {
  fg: string; bg: string; border: string; needle: string;
}> = {
  high_anti:     { fg: 'text-red-400',     bg: 'bg-red-950/30',     border: 'border-red-800/40',     needle: '#f87171' },
  elevated_anti: { fg: 'text-orange-400',  bg: 'bg-orange-950/30',  border: 'border-orange-800/40',  needle: '#fb923c' },
  contested:     { fg: 'text-yellow-400',  bg: 'bg-yellow-950/30',  border: 'border-yellow-800/40',  needle: '#facc15' },
  mild_pro:      { fg: 'text-lime-400',    bg: 'bg-lime-950/30',    border: 'border-lime-800/40',    needle: '#a3e635' },
  strong_pro:    { fg: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-800/40', needle: '#34d399' },
};

// Static color stops for the gauge arc. Keep these darker than the foreground
// text so the needle remains the visual focal point.
const ZONE_SEGMENTS = [
  { start: 0,  end: 25,  color: '#7f1d1d' }, // red
  { start: 25, end: 40,  color: '#7c2d12' }, // orange
  { start: 40, end: 55,  color: '#713f12' }, // yellow
  { start: 55, end: 70,  color: '#365314' }, // lime
  { start: 70, end: 100, color: '#064e3b' }, // emerald
] as const;

/**
 * Convert a 0-100 score into an (x, y) point on the gauge semicircle.
 * The semicircle spans 180° (left) → 0° (right), so a score of 0 sits
 * at the leftmost point and 100 sits at the rightmost.
 */
function pctToPoint(pct: number, cx: number, cy: number, r: number) {
  const deg = 180 - (pct / 100) * 180;
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function Gauge({ score, needleColor }: { score: number; needleColor: string }) {
  const cx = 100;
  const cy = 100;
  const r  = 80;
  const needleLen = 70;
  const angleDeg = 180 - (score / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const nx = cx + needleLen * Math.cos(angleRad);
  const ny = cy - needleLen * Math.sin(angleRad);

  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-xs">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#1f2937"
        strokeWidth="18"
      />

      {/* Colored zone segments */}
      {ZONE_SEGMENTS.map(seg => {
        const start = pctToPoint(seg.start, cx, cy, r);
        const end   = pctToPoint(seg.end,   cx, cy, r);
        return (
          <path
            key={seg.start}
            d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={seg.color}
            strokeWidth="18"
            strokeLinecap="butt"
          />
        );
      })}

      {/* Tick marks at 0/25/50/75/100 */}
      {[0, 25, 50, 75, 100].map(t => {
        const outer = pctToPoint(t, cx, cy, r);
        const inner = pctToPoint(t, cx, cy, r - 14);
        return (
          <line
            key={t}
            x1={inner.x} y1={inner.y}
            x2={outer.x} y2={outer.y}
            stroke="#374151"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Needle — animates smoothly when score changes */}
      <line
        x1={cx} y1={cy} x2={nx} y2={ny}
        stroke={needleColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ transition: 'all 0.8s ease-out' }}
      />
      <circle cx={cx} cy={cy} r={6} fill={needleColor} />
      <circle cx={cx} cy={cy} r={3} fill="#0a0a0a" />

      {/* End labels */}
      <text x="10"  y="118" fill="#6b7280" fontSize="9" fontFamily="ui-monospace, monospace">ANTI</text>
      <text x="173" y="118" fill="#6b7280" fontSize="9" fontFamily="ui-monospace, monospace">PRO</text>
      <text x="92"  y="20"  fill="#6b7280" fontSize="8" fontFamily="ui-monospace, monospace">NEUTRAL</text>
    </svg>
  );
}

export default function IncumbencyMeter() {
  const [data, setData] = useState<MeterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 60_000); // ride HF cold starts
        const r = await fetch(`${API}/api/stats/incumbency-meter`, {
          cache: 'no-store',
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as MeterResponse;
        if (!cancelled) {
          setData(j);
          setLastUpdated(new Date());
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    // 5-minute auto-refresh — meter stays live even on a parked tab
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading && !data) {
    return (
      <section className="bg-[#15161c] border border-[#262833] rounded-lg p-5 mb-6 h-56 animate-pulse" />
    );
  }
  if (error || !data) {
    // Fail quiet — the rest of the dashboard is still useful without this card
    return null;
  }

  const style = ZONE_STYLE[data.zone] ?? ZONE_STYLE.contested;
  const updatedAgo = lastUpdated
    ? Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    : null;

  return (
    <section className={`${style.bg} ${style.border} border rounded-lg p-5 mb-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <Activity size={15} className={style.fg} />
          Incumbency Meter
          <span className="text-gray-600 text-xs font-normal">
            · evidence-weighted, realtime
          </span>
        </h2>
        <span className="text-gray-600 text-[11px] flex items-center gap-1.5">
          <Clock size={10} />
          Day {data.govt_day} of {data.govt_name} govt
          {updatedAgo !== null && updatedAgo < 60 && (
            <span className="text-emerald-500/70">· live</span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center">
        {/* Gauge + score */}
        <div className="flex flex-col items-center">
          <Gauge score={data.score} needleColor={style.needle} />
          <div className="text-center -mt-2">
            <div className={`text-4xl font-bold ${style.fg} tabular-nums`}>
              {data.score.toFixed(0)}
            </div>
            <div className={`text-[11px] uppercase tracking-wider mt-1 ${style.fg} opacity-90`}>
              {data.zone_label}
            </div>
          </div>
        </div>

        {/* Driving factors */}
        <div className="min-w-0">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2 font-medium">
            What's moving the needle
          </div>
          {data.factors.length === 0 ? (
            <p className="text-gray-500 text-sm italic">
              Insufficient evidence yet — meter sits at neutral until categories accrue data.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.factors.map(f => {
                const isAnti = f.direction === 'anti';
                const Icon = isAnti ? TrendingDown : TrendingUp;
                const color = isAnti ? 'text-red-400' : 'text-emerald-400';
                const sign  = isAnti ? '−' : '+';
                return (
                  <li key={f.key} className="flex items-start gap-2 text-sm">
                    <Icon size={14} className={`${color} mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-300">{f.label}</span>
                      <span className={`ml-2 ${color} font-mono text-[11px] whitespace-nowrap`}>
                        {sign}{f.points.toFixed(1)} pts
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Totals + methodology link */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-2 text-[11px]">
            <span className="text-gray-500">
              Anti-pressure <span className="text-red-400 font-mono">−{data.anti_pressure_total.toFixed(1)}</span>
              <span className="mx-2 text-gray-700">·</span>
              Pro-boost <span className="text-emerald-400 font-mono">+{data.pro_boost_total.toFixed(1)}</span>
              {data.honeymoon_softener > 0 && (
                <>
                  <span className="mx-2 text-gray-700">·</span>
                  Honeymoon <span className="text-sky-400 font-mono">+{data.honeymoon_softener.toFixed(1)}</span>
                </>
              )}
            </span>
            <a
              href="/methodology#incumbency-meter"
              className="text-gray-500 hover:text-white underline-offset-2 hover:underline"
            >
              How this is calculated →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
