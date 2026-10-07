export const languages = ['en', 'es'] as const;
export type Lang = (typeof languages)[number];

export const DEFAULT_LANG: Lang = 'en';

/**
 * Reads a language out of a setting such as "es", "es-CO", "es_ES.UTF-8" or "C". Returns null
 * for anything that is not one of the languages GreenLight is written in, so the caller can
 * keep looking.
 */
export function parseLang(raw: string | undefined | null): Lang | null {
  const primary = raw?.trim().toLowerCase().split(/[-_.@:]/)[0];
  return languages.find((lang) => lang === primary) ?? null;
}

/**
 * The language a command line run speaks. The explicit setting wins, then the language of the
 * operating system, and English when neither says anything GreenLight knows. Library functions
 * never call this: they take the language they are given, so that output stays predictable.
 */
export function resolveLang(
  env: Record<string, string | undefined>,
  systemLocale: () => string | undefined = () => Intl.DateTimeFormat().resolvedOptions().locale,
): Lang {
  const explicit = parseLang(env['GREENLIGHT_LANG']);
  if (explicit !== null) {
    return explicit;
  }
  // LANGUAGE can hold a list such as "es:en"; the first entry is the one the person prefers.
  for (const name of ['LC_ALL', 'LC_MESSAGES', 'LANG', 'LANGUAGE']) {
    const found = parseLang(env[name]);
    if (found !== null) {
      return found;
    }
  }
  try {
    return parseLang(systemLocale()) ?? DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}
