'use client';
import { DashboardStats } from '@/lib/api';
import { useLocale, LocaleToggle } from './LocaleProvider';
import { MobileMenuButton } from './Sidebar';
import { StringKey } from '@/lib/i18n';
import ChennaiClock from './ChennaiClock';

function Chip({ labelKey, count, color }: { labelKey: StringKey; count: number; color: string }) {
  const { t } = useLocale();
  return (
    <span className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap shrink-0">
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
    <div className="bg-[#111] border-b border-[#222] sticky top-0 z-30">
      {/* Row 1: brand + locale + report (always visible) */}
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        <MobileMenuButton />
        <span className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-gray-400 font-medium hidden sm:inline">{t('top.govt_age')}:</span>
          <span className="bg-gray-700 text-white px-2 py-0.5 rounded font-bold text-xs">
            {t('top.day')} {stats.govt_day}
          </span>
        </span>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ChennaiClock />
          <LocaleToggle />
          <a
            href="/report"
            className="text-xs bg-[#222] hover:bg-[#333] text-gray-300 px-2 sm:px-3 py-1.5 rounded border border-[#333] transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">{t('top.report_issue')}</span>
            <span className="sm:hidden">Report</span>
          </a>
        </div>
      </div>

      {/* Row 2: counter chips — wrap on tablet+, horizontal-scroll on mobile */}
      <div
        className="flex items-center gap-3 sm:gap-6 px-3 sm:px-4 pb-2 sm:flex-wrap overflow-x-auto sm:overflow-visible scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        <Chip labelKey="top.corruption" count={stats.corruption_count} color="bg-yellow-600" />
        <Chip labelKey="top.crimes_kids" count={stats.crimes_women_kids_count} color="bg-orange-600" />
        <Chip labelKey="top.murders" count={stats.murders_count} color="bg-red-600" />
        <Chip labelKey="top.sexual" count={stats.sexual_assault_count} color="bg-red-700" />
        <Chip labelKey="top.credit_steals" count={stats.credit_steal_count} color="bg-blue-600" />
      </div>
    </div>
  );
}
