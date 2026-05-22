import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  label: string;
  value: number | string;
  sub?: string;
  icon: LucideIcon;
  color?: string;
}

export default function StatCard({ label, value, sub, icon: Icon, color = 'text-white' }: Props) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 flex flex-col gap-3 hover:border-[#333] transition-colors">
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-medium">
        <Icon size={13} />
        {label}
      </div>
      <div className={clsx('text-4xl font-bold', color)}>
        {value}
        {sub && <span className="text-gray-500 text-base font-normal ml-1">{sub}</span>}
      </div>
    </div>
  );
}
