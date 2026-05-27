import { LucideIcon, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

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
}

export default function StatCard({ label, value, sub, icon: Icon, color = 'text-white', verified }: Props) {
  const numericValue = typeof value === 'number' ? value : undefined;
  const leadVerified =
    verified !== undefined &&
    numericValue !== undefined;

  // When verified mode: headline = verified, supplemental = community count
  const headline = leadVerified ? verified : value;
  const community = leadVerified ? (numericValue! - verified!) : 0;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 flex flex-col gap-2 hover:border-[#333] transition-colors">
      <div className="flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider font-medium">
        <span className="flex items-center gap-2">
          <Icon size={13} />
          {label}
        </span>
        {leadVerified && (
          <span
            title="Includes cross-verified + press-confirmed + admin-verified"
            className="flex items-center gap-1 text-[10px] text-emerald-500/70 normal-case tracking-normal"
          >
            <ShieldCheck size={10} /> verified
          </span>
        )}
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
    </div>
  );
}
