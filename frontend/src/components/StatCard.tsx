import { LucideIcon, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  label: string;
  value: number | string;
  sub?: string;
  icon: LucideIcon;
  color?: string;
  /** When provided, renders an honest "X verified · (total–X) pending" split
   *  beneath the headline number. Only shown if `value` is a number. */
  verified?: number;
}

export default function StatCard({ label, value, sub, icon: Icon, color = 'text-white', verified }: Props) {
  const numericValue = typeof value === 'number' ? value : undefined;
  const showSplit =
    verified !== undefined &&
    numericValue !== undefined &&
    numericValue > 0;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 flex flex-col gap-2 hover:border-[#333] transition-colors">
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-medium">
        <Icon size={13} />
        {label}
      </div>
      <div className={clsx('text-4xl font-bold', color)}>
        {value}
        {sub && <span className="text-gray-500 text-base font-normal ml-1">{sub}</span>}
      </div>
      {showSplit && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 -mt-1">
          <ShieldCheck size={10} className="text-emerald-500/70" />
          <span className="text-emerald-400/80 font-medium">{verified} verified</span>
          {(numericValue! - verified) > 0 && (
            <>
              <span className="text-gray-700">·</span>
              <span className="text-amber-400/70">{numericValue! - verified} pending</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
