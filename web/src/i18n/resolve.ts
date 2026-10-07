import { DEFAULT_LANG, parseLang, type Lang } from 'greenlight/i18n';

const MAX_HEADER_LENGTH = 1024;
const MAX_ENTRIES = 20;

interface Preference {
  lang: Lang;
  weight: number;
  order: number;
}

/**
 * The first language GreenLight is written in that the browser asks for, honouring the
 * weights. A header that is absurdly long, or full of languages GreenLight does not speak, says
 * nothing.
 */
export function parseAcceptLanguage(header: string | null | undefined): Lang | null {
  if (header === null || header === undefined || header.length > MAX_HEADER_LENGTH) {
    return null;
  }
  const preferences: Preference[] = [];
  header
    .split(',')
    .slice(0, MAX_ENTRIES)
    .forEach((entry, order) => {
      const [tag = '', ...parameters] = entry.split(';');
      const lang = parseLang(tag.trim());
      if (lang === null) {
        return;
      }
      const quality = parameters.map((parameter) => /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(parameter)?.[1]).find(Boolean);
      const weight = quality === undefined ? 1 : Number(quality);
      if (Number.isFinite(weight) && weight > 0) {
        preferences.push({ lang, weight, order });
      }
    });
  preferences.sort((a, b) => b.weight - a.weight || a.order - b.order);
  return preferences[0]?.lang ?? null;
}

export interface LanguageSources {
  cookie: Lang | null;
  setting: string | undefined;
  acceptLanguage: string | null;
}

/** The person's choice, then the setting of the installation, then the browser, then English. */
export function resolveLanguage(sources: LanguageSources): Lang {
  return sources.cookie ?? parseLang(sources.setting) ?? parseAcceptLanguage(sources.acceptLanguage) ?? DEFAULT_LANG;
}
