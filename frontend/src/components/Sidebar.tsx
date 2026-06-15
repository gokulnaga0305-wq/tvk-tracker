'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, AlertTriangle, CheckSquare, Users,
  Info, Copy, MessageSquarePlus, ShieldCheck, Menu, X, Database, ScrollText,
  MapPin, RotateCcw, Factory, Zap, Activity, Wine,
} from 'lucide-react';
import clsx from 'clsx';
import { useLocale } from './LocaleProvider';
import { StringKey } from '@/lib/i18n';

const NAV: { href: string; key: StringKey; icon: any }[] = [
  { href: '/',              key: 'nav.dashboard',     icon: LayoutDashboard },
  { href: '/incidents',     key: 'nav.incidents',     icon: AlertTriangle },
  { href: '/credit-steals', key: 'nav.credit_steals', icon: Copy },
  { href: '/districts',     key: 'nav.districts',     icon: MapPin },
  { href: '/receipts',      key: 'nav.receipts',      icon: ScrollText },
  { href: '/dmk-timeline',  key: 'nav.dmk_timeline',  icon: Database },
  { href: '/investments',   key: 'nav.investments',   icon: Factory },
  { href: '/power',         key: 'nav.power',         icon: Zap },
  { href: '/tasmac',        key: 'nav.tasmac',        icon: Wine },
  { href: '/promises',      key: 'nav.promises',      icon: CheckSquare },
  { href: '/members',       key: 'nav.members',       icon: Users },
  { href: '/report',        key: 'nav.report',        icon: MessageSquarePlus },
  { href: '/methodology',   key: 'nav.methodology',   icon: ShieldCheck },
  { href: '/data-health',   key: 'nav.data_health',   icon: Activity },
  { href: '/corrections',   key: 'nav.corrections',   icon: RotateCcw },
  { href: '/about',         key: 'nav.about',         icon: Info },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Listen for hamburger toggle from MobileMenuButton
  useEffect(() => {
    const handler = () => setMobileOpen(v => !v);
    window.addEventListener('toggle-sidebar', handler);
    return () => window.removeEventListener('toggle-sidebar', handler);
  }, []);

  const Content = (
    <>
      <div className="px-4 py-5 border-b border-[#222] flex items-center justify-between">
        <div>
          <span className="text-white font-bold text-lg tracking-tight">TVK Files</span>
          <span className="ml-2 text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-semibold">BETA</span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-gray-500 hover:text-white p-1"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
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
    </>
  );

  return (
    <>
      {/* Desktop sidebar (always visible from md and up) */}
      <aside className="hidden md:flex w-52 shrink-0 bg-[#111] border-r border-[#222] flex-col min-h-screen sticky top-0 h-screen">
        {Content}
      </aside>

      {/* Mobile: backdrop + slide-in drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={clsx(
          'md:hidden fixed left-0 top-0 bottom-0 w-64 z-50 bg-[#111] border-r border-[#222] flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {Content}
      </aside>
    </>
  );
}

/**
 * Hamburger button rendered in the top bar on mobile. Emits a custom
 * event the Sidebar listens for. We use an event rather than a shared
 * context so the SSR-rendered TopBar (server component-friendly) doesn't
 * need to mount the LocaleProvider context hierarchy for a single toggle.
 */
export function MobileMenuButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
      className="md:hidden text-gray-300 hover:text-white p-1.5 -ml-1.5"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}
