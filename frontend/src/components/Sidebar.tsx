'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, AlertTriangle, CheckSquare, Users,
  Info, Copy, MessageSquarePlus, ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { useLocale } from './LocaleProvider';
import { StringKey } from '@/lib/i18n';

const NAV: { href: string; key: StringKey; icon: any }[] = [
  { href: '/',              key: 'nav.dashboard',     icon: LayoutDashboard },
  { href: '/incidents',     key: 'nav.incidents',     icon: AlertTriangle },
  { href: '/credit-steals', key: 'nav.credit_steals', icon: Copy },
  { href: '/promises',      key: 'nav.promises',      icon: CheckSquare },
  { href: '/members',       key: 'nav.members',       icon: Users },
  { href: '/report',        key: 'nav.report',        icon: MessageSquarePlus },
  { href: '/methodology',   key: 'nav.methodology',   icon: ShieldCheck },
  { href: '/about',         key: 'nav.about',         icon: Info },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  return (
    <aside className="w-52 shrink-0 bg-[#111] border-r border-[#222] flex flex-col min-h-screen">
      <div className="px-4 py-5 border-b border-[#222]">
        <span className="text-white font-bold text-lg tracking-tight">TVK Files</span>
        <span className="ml-2 text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-semibold">BETA</span>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-[#1e1e1e] text-white font-medium border-r-2 border-orange-500'
                  : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
              )}
            >
              <Icon size={16} />
              {t(key)}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-[#222] text-[11px] text-gray-600">
        {t('common.tracking_since')}
      </div>
    </aside>
  );
}
