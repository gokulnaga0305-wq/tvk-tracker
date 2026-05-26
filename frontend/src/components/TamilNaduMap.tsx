'use client';
import { useState } from 'react';

/**
 * TamilNaduMap — stylised hex-grid choropleth of TN's 38 districts.
 *
 * Not a geographically-perfect map: each district is a hexagon whose (col,
 * row) coordinates approximate its real geographic position. Trade-off is
 * deliberate — a real SVG map of TN would be 200KB+ of detailed polygons.
 * The hex grid loads instantly, scales to any screen, and gives the user
 * the same "which corner is red" insight at a glance.
 *
 * Color encodes the chosen window's score:
 *   <25  Very angry  red
 *   <40  Angry       orange
 *   <55  Tense       yellow
 *   <70  Calm        lime
 *   >=70 Quiet       emerald
 */

interface DistrictRow {
  district: string;
  score_7d: number;
  score_30d: number;
  zone_7d: string;
  zone_30d: string;
  incidents_7d: number;
  incidents_30d: number;
  top_categories_7d: Array<{ category: string; count: number }>;
  top_categories_30d: Array<{ category: string; count: number }>;
  last_incident_date: string | null;
}

// (col, row) coordinates for each district. Roughly approximates TN geography:
//   north -> low row numbers
//   south -> high row numbers
//   east  -> high col numbers
//   west  -> low col numbers
// (TN extends roughly NW to SE so the diagonal layout matches the state's shape.)
const POSITIONS: Record<string, [number, number]> = {
  // North-east coast (top right)
  Tiruvallur:        [6, 0],
  Chennai:           [7, 0],
  // North-west belt
  Krishnagiri:       [2, 1],
  Vellore:           [4, 1],
  Ranipet:           [5, 1],
  Tirupattur:        [3, 1],
  Kanchipuram:       [6, 1],
  Chengalpattu:      [7, 1],
  // North-central
  Dharmapuri:        [2, 2],
  Tiruvannamalai:    [4, 2],
  Viluppuram:        [6, 2],
  // Central
  Salem:             [3, 3],
  Kallakurichi:      [5, 3],
  Cuddalore:         [7, 3],
  // Mid-central
  Namakkal:          [3, 4],
  Perambalur:        [4, 4],
  Ariyalur:          [5, 4],
  Mayiladuthurai:    [7, 4],
  // Central row
  Nilgiris:          [1, 5],
  Erode:             [2, 5],
  Karur:             [3, 5],
  Tiruchirappalli:   [4, 5],
  Tiruvarur:         [6, 5],
  Nagapattinam:      [7, 5],
  // South-central
  Coimbatore:        [1, 6],
  Tiruppur:          [2, 6],
  Dindigul:          [3, 6],
  Pudukkottai:       [5, 6],
  Thanjavur:         [6, 6],
  // South
  Theni:             [2, 7],
  Madurai:           [3, 7],
  Sivaganga:         [5, 7],
  Ramanathapuram:    [6, 7],
  // Far south
  Tenkasi:           [2, 8],
  Virudhunagar:      [4, 8],
  // Southern tip
  Tirunelveli:       [3, 9],
  Thoothukudi:       [5, 9],
  // Cape
  Kanyakumari:       [4, 10],
};

function colorForZone(zone: string): { fill: string; stroke: string } {
  switch (zone) {
    case 'Very angry': return { fill: '#7f1d1d', stroke: '#ef4444' };
    case 'Angry':      return { fill: '#7c2d12', stroke: '#fb923c' };
    case 'Tense':      return { fill: '#713f12', stroke: '#facc15' };
    case 'Calm':       return { fill: '#365314', stroke: '#a3e635' };
    case 'Quiet':      return { fill: '#064e3b', stroke: '#10b981' };
    default:           return { fill: '#1f2937', stroke: '#4b5563' };
  }
}

function HexPath({ cx, cy, r }: { cx: number; cy: number; r: number }): string {
  // Pointy-top hexagon centred at (cx, cy) with circumradius r
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const CAT_FALLBACK: Record<string, string> = {};

export default function TamilNaduMap({
  districts,
  window,
  categoryLabels = CAT_FALLBACK,
}: {
  districts: DistrictRow[];
  window: '7d' | '30d';
  categoryLabels?: Record<string, string>;
}) {
  const [hover, setHover] = useState<DistrictRow | null>(null);

  // Hex geometry
  const HEX_R = 28;
  const HEX_W = HEX_R * Math.sqrt(3);
  const HEX_H = HEX_R * 1.5;
  const PAD   = 30;
  const cols  = 9;
  const rows  = 11;
  const W     = PAD * 2 + cols * HEX_W;
  const H     = PAD * 2 + rows * HEX_H + HEX_R;

  // Index districts by name for quick lookup
  const byName: Record<string, DistrictRow> = {};
  districts.forEach(d => { byName[d.district] = d; });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 items-start">
      {/* Map */}
      <div className="bg-[#15161c] border border-[#262833] rounded-lg p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl mx-auto" style={{ minWidth: 380 }}>
          {Object.entries(POSITIONS).map(([name, [col, row]]) => {
            const d = byName[name];
            const zone = d ? (window === '7d' ? d.zone_7d : d.zone_30d) : 'Quiet';
            const score = d ? (window === '7d' ? d.score_7d : d.score_30d) : 50;
            const colors = colorForZone(zone);
            // Offset every other row by half a hex width to create the
            // honeycomb staggering effect
            const xOffset = (row % 2 === 1) ? HEX_W / 2 : 0;
            const cx = PAD + col * HEX_W + xOffset + HEX_W / 2;
            const cy = PAD + row * HEX_H + HEX_R;

            return (
              <g
                key={name}
                onMouseEnter={() => setHover(d)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(d)}
                style={{ cursor: 'pointer' }}
              >
                <path
                  d={HexPath({ cx, cy, r: HEX_R - 2 })}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={hover?.district === name ? 2.5 : 1}
                  style={{ transition: 'all 0.15s' }}
                />
                <text
                  x={cx}
                  y={cy - 2}
                  textAnchor="middle"
                  fontSize="7.5"
                  fontFamily="ui-monospace, monospace"
                  fill="#fff"
                  fontWeight="500"
                  style={{ pointerEvents: 'none' }}
                >
                  {name.length > 10 ? name.slice(0, 9) + '…' : name}
                </text>
                <text
                  x={cx}
                  y={cy + 9}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                  fill="#fff"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {score.toFixed(0)}
                </text>
              </g>
            );
          })}
        </svg>
        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-3 text-[10px] flex-wrap">
          {['Very angry','Angry','Tense','Calm','Quiet'].map(z => {
            const c = colorForZone(z);
            return (
              <span key={z} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={{ background: c.fill, border: `1px solid ${c.stroke}` }} />
                <span className="text-gray-400">{z}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Hover detail panel */}
      <div className="bg-[#15161c] border border-[#262833] rounded-lg p-4 min-h-[200px]">
        {hover ? (
          <>
            <h3 className="text-white font-semibold flex items-baseline justify-between gap-2 mb-2">
              {hover.district}
              <span className={`text-xs uppercase tracking-wider ${
                {'Very angry':'text-red-400','Angry':'text-orange-400','Tense':'text-yellow-400','Calm':'text-lime-400','Quiet':'text-emerald-400'}[window === '7d' ? hover.zone_7d : hover.zone_30d] ?? 'text-gray-500'
              }`}>
                {window === '7d' ? hover.zone_7d : hover.zone_30d}
              </span>
            </h3>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-white tabular-nums">
                {(window === '7d' ? hover.score_7d : hover.score_30d).toFixed(0)}
              </span>
              <span className="text-[11px] text-gray-500">
                {(window === '7d' ? hover.incidents_7d : hover.incidents_30d)} incidents in last {window === '7d' ? '7' : '30'}d
              </span>
            </div>
            {(window === '7d' ? hover.top_categories_7d : hover.top_categories_30d).length > 0 ? (
              <ul className="text-xs text-gray-400 space-y-1">
                {(window === '7d' ? hover.top_categories_7d : hover.top_categories_30d).slice(0, 5).map(c => (
                  <li key={c.category} className="flex items-baseline justify-between gap-2 border-b border-[#222] pb-1">
                    <span>{categoryLabels[c.category] ?? c.category}</span>
                    <span className="text-gray-500 font-mono">×{c.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-xs">No recent issues</p>
            )}
            {hover.last_incident_date && (
              <p className="text-[10px] text-gray-600 mt-3">
                Last incident: {new Date(hover.last_incident_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
              </p>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm italic">Hover over a district to see details</p>
        )}
      </div>
    </div>
  );
}
