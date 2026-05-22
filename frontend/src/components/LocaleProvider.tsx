'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Locale, t as translate, StringKey } from '@/lib/i18n';

type LocaleCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: StringKey) => string;
};

const Ctx = createContext<LocaleCtx>({
  locale: 'en',
  setLocale: () => {},
  t: k => translate(k, 'en'),
});

export function LocaleProvider({ children, initial = 'en' }: { children: React.ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  useEffect(() => {
    // Hydrate from cookie if present (SSR/client mismatch handled gracefully)
    const m = document.cookie.match(/locale=(en|ta)/);
    if (m && m[1] !== locale) setLocaleState(m[1] as Locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = (l: Locale) => {
    document.cookie = `locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = l === 'ta' ? 'ta' : 'en';
    setLocaleState(l);
  };

  const value: LocaleCtx = {
    locale,
    setLocale,
    t: (key: StringKey) => translate(key, locale),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx);
}

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="inline-flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden text-xs font-medium">
      <button
        onClick={() => setLocale('en')}
        className={
          locale === 'en'
            ? 'bg-white text-black px-3 py-1.5'
            : 'text-gray-400 hover:text-white px-3 py-1.5'
        }
        aria-label="English"
      >
        EN
      </button>
      <button
        onClick={() => setLocale('ta')}
        className={
          locale === 'ta'
            ? 'bg-white text-black px-3 py-1.5'
            : 'text-gray-400 hover:text-white px-3 py-1.5'
        }
        aria-label="Tamil"
        style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}
      >
        தமிழ்
      </button>
    </div>
  );
}
