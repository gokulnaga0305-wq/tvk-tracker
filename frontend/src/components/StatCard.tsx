import { LucideIcon, ShieldCheck, ExternalLink, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { BaselineTopSource } from '@/lib/api';

interface Props {
  label: string;
  value: number | string;
  sub?: string;
  icon: LucideIcon;
  color?: string;
  /** When provided, the card LEADS WITH `verified` as the big number and
   *  shows the unverified remainder (community reports) in smaller text below.
   *  The headline = press-confirmed + cross-verified + admin-verified for
   *  this category.  The remainder = Reddit / social-only reports for the
   *  same category — labelled as "community reports", not "pending
   *  corroboration", because they're not actually waiting for press
   *  confirmation that may never come. */
  verified?: number;
  /** Up to 3 highest-impact press URLs behind this count. When present,
   *  rendered as a tiny chip list at the bottom of the card so users can
   *  jump straight to the source articles. Backend ranks by severity desc
   *  + most-recent date. */
  topSources?: BaselineTopSource[];
  /** Category slug for the drilldown page. When provided, the WHOLE CARD
   *  becomes a link to /category/[href] (the rich image-led news feed
   *  for incidents in this widget). The internal source chips remain
   *  individually clickable and don't trigger the card-level navigation.
   *  Standard category slugs: corruption, murders, power_eb, credit_stealing,
   *  governance, broken_promise, alcohol_menace, fake_news, civic_failure,
   *  police_excess, sexual_assault, crimes_women_kids, etc. */
  href?: string;
  /** Number of days the TVK government has been in office. When provided
   *  with a numeric value, the card shows an honest per-month RATE
   *  ("≈ 5.2/month") under the headline. Raw counts grow just because
   *  time passes; a rate is the honest figure and pre-empts the
   *  "counts aren't rates" critique. We do NOT invent a baseline — that
   *  would be fabrication — we just normalise our own number truthfully. */
  govtDays?: number;
}

export default function StatCard({ label, value, sub, icon: Icon, color = 'text-white', verified, topSources, href, govtDays }: Props) {
  const numericValue = typeof value === 'number' ? value : undefined;
  // Honest per-month rate: count / days-in-office * 30, shown only when we
  // have a real day count and a non-trivial value.
  const perMonth =
    govtDays && govtDays > 0 && numericValue !== undefined && numericValue > 0
      ? (numericValue / govtDays) * 30
      : null;
  const leadVerified =
    verified !== undefined &&
    numericValue !== undefined;

  // When verified mode: headline = verified, supplemental = community count
  const headline = leadVerified ? verified : value;
  const community = leadVerified ? (numericValue! - verified!) : 0;
  const sources = topSources || [];
  const hasSources = sources.length > 0;

  // When href is provided the whole card becomes a clickable link to the
  // category drilldown. We render the same shell but wrap it in a Link.
  // The CardShell below is identical for both modes — keeping styling
  // co-located so the visual stays consistent.
  const CardShell = ({ children }: { children: React.ReactNode }) => {
    const cls = clsx(
      'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 flex flex-col gap-2 transition-colors h-full',
      href ? 'hover:border-orange-700/40 cursor-pointer group/card' : 'hover:border-[#333]'
    );
    return href ? (
      <Link href={`/category/${href}`} className={cls} aria-label={`View all ${label} incidents`}>
        {children}
      </Link>
    ) : (
      <div className={cls}>{children}</div>
    );
  };

  return (
    <CardShell>
      <div className="flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider font-medium">
        <span className="flex items-center gap-2">
          <Icon size={13} />
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          {leadVerified && (
            <span
              title="Includes cross-verified + press-confirmed + admin-verified"
              className="flex items-center gap-1 text-[10px] text-emerald-500/70 normal-case tracking-normal"
            >
              <ShieldCheck size={10} /> verified
            </span>
          )}
          {href && (
            <ChevronRight
              size={13}
              className="text-gray-700 group-hover/card:text-orange-400 group-hover/card:translate-x-0.5 transition-all"
            />
          )}
        </span>
      </div>
      <div className={clsx('text-4xl font-bold', color)}>
        {headline}
        {sub && <span className="text-gray-500 text-base font-normal ml-1">{sub}</span>}
      </div>
      {leadVerified && community > 0 && (
        <div
          className="text-[11px] text-amber-400/70 -mt-1"
          title="Reported on Reddit / social media only — no press confirmation yet"
        >
          +{community} community report{community === 1 ? '' : 's'}
        </div>
      )}
      {leadVerified && community === 0 && numericValue! > 0 && (
        <div className="text-[11px] text-gray-600 -mt-1">all press-confirmed</div>
      )}
      {perMonth !== null && (
        <div
          className="text-[11px] text-gray-500"
          title="Honest rate: our count normalised per 30 days in office. Raw totals grow with time; a rate doesn't."
        >
          ≈ {perMonth.toFixed(perMonth >= 10 ? 0 : 1)}/month
        </div>
      )}

      {/* Top press sources behind the count. Chips link straight to the
          highest-impact press articles so users can verify rather than
          just trust the headline number. e.stopPropagation() prevents
          the outer card-link from intercepting clicks on the chip. */}
      {hasSources && (
        <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1">
          {sources.map((s) => (
            <a
              key={s.incident_id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={s.incident_title || s.url}
              className="group/src text-[10.5px] text-gray-400 hover:text-orange-400 truncate flex items-center gap-1 transition-colors"
            >
              <ExternalLink size={9} className="opacity-50 group-hover/src:opacity-100 shrink-0" />
              <span className="font-medium text-gray-300 group-hover/src:text-orange-400">
                {s.outlet}
              </span>
              <span className="text-gray-600 truncate">
                · {s.incident_title}
              </span>
            </a>
          ))}
        </div>
      )}
    </CardShell>
  );
}
