'use client';
import { DashboardStats } from '@/lib/api';
import { useLocale, LocaleToggle } from './LocaleProvider';
import { StringKey } from '@/lib/i18n';

function Chip({ labelKey, count, color }: { labelKey: StringKey; count: number; color: string }) {
  const { t } = useLocale();
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-gray-300">{t(labelKey)}:</span>
      <span className={`font-bold px-2 py-0.5 rounded text-white text-xs ${color}`}>
        {count}
      </span>
    </span>
  );
}

export default function TopBar({ stats }: { stats: DashboardStats }) {
  const { t } = useLocale();
  return (
    <div className="bg-[#111] border-b border-[#222] px-4 py-2.5 flex items-center gap-6 flex-wrap text-sm sticky top-0 z-10">
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-gray-400 font-medium">{t('top.govt_age')}:</span>
        <span className="bg-gray-700 text-white px-2 py-0.5 rounded font-bold text-xs">
          {t('top.day')} {stats.govt_day}
        </span>
      </span>
      <div className="h-4 w-px bg-[#333]" />
      <Chip labelKey="top.corruption" count={stats.corruption_count} color="bg-yellow-600" />
      <Chip labelKey="top.crimes_kids" count={stats.crimes_women_kids_count} color="bg-orange-600" />
      <Chip labelKey="top.murders" count={stats.murders_count} color="bg-red-600" />
      <Chip labelKey="top.sexual" count={stats.sexual_assault_count} color="bg-red-700" />
      <Chip labelKey="top.credit_steals" count={stats.credit_steal_count} color="bg-blue-600" />
      <div className="ml-auto flex items-center gap-2">
        <LocaleToggle />
        <a
          href="/report"
          className="text-xs bg-[#222] hover:bg-[#333] text-gray-300 px-3 py-1.5 rounded border border-[#333] transition-colors"
        >
          {t('top.report_issue')}
        </a>
      </div>
    </div>
  );
}
