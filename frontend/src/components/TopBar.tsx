import { DashboardStats } from '@/lib/api';

function Chip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-gray-300">{label}:</span>
      <span className={`font-bold px-2 py-0.5 rounded text-white text-xs ${color}`}>
        {count}
      </span>
    </span>
  );
}

export default function TopBar({ stats }: { stats: DashboardStats }) {
  return (
    <div className="bg-[#111] border-b border-[#222] px-4 py-2.5 flex items-center gap-6 flex-wrap text-sm sticky top-0 z-10">
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-gray-400 font-medium">GOVT AGE:</span>
        <span className="bg-gray-700 text-white px-2 py-0.5 rounded font-bold text-xs">
          DAY {stats.govt_day}
        </span>
      </span>
      <div className="h-4 w-px bg-[#333]" />
      <Chip label="Corruption" count={stats.corruption_count} color="bg-yellow-600" />
      <Chip label="Crimes vs Women & Kids" count={stats.crimes_women_kids_count} color="bg-orange-600" />
      <Chip label="Murders (Month)" count={stats.murders_count} color="bg-red-600" />
      <Chip label="Sexual Assaults (Month)" count={stats.sexual_assault_count} color="bg-red-700" />
      <Chip label="Credit Steals" count={stats.credit_steal_count} color="bg-blue-600" />
      <div className="ml-auto">
        <a
          href="https://github.com"
          target="_blank"
          className="text-xs bg-[#222] hover:bg-[#333] text-gray-300 px-3 py-1.5 rounded border border-[#333] transition-colors"
        >
          Report Issue?
        </a>
      </div>
    </div>
  );
}
