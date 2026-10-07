'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_LANG, messagesFor, type Lang, type Messages } from '.';

const LanguageContext = createContext<Lang>(DEFAULT_LANG);

export function LanguageProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LanguageContext value={lang}>{children}</LanguageContext>;
}

export function useLang(): Lang {
  return useContext(LanguageContext);
}

export function useMessages(): Messages {
  return messagesFor(useLang());
}
