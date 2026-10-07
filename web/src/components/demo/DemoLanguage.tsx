'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { LanguageProvider } from '@/i18n/context';
import { demoLanguageOnTheServer, demoLanguageSnapshot, subscribeToDemoLanguage } from '@/lib/demo-language';

/**
 * The page is built in English and shows the visitor's language as soon as it runs. The first
 * render must match the built page, so it is English; the store then gives the real language
 * in the same pass, and only then is the page shown.
 */
export function DemoLanguage({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribeToDemoLanguage, demoLanguageSnapshot, demoLanguageOnTheServer);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.removeAttribute('data-pending');
  }, [lang]);

  return <LanguageProvider lang={lang}>{children}</LanguageProvider>;
}
