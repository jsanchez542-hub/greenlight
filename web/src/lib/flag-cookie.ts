import { languages, type Lang } from 'greenlight/i18n';

export const FLAG_COOKIE_NAME = 'greenlight_ui';
export const FLAG_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export const LANGUAGE_TOKENS: Record<Lang, string> = Object.fromEntries(
  languages.map((lang) => [lang, `lang-${lang}`]),
) as Record<Lang, string>;

const TOKEN_SEPARATOR = '.';
const MAX_COOKIE_VALUE_LENGTH = 256;

/**
 * Reads the tokens of the interface cookie out of a `document.cookie` string. Only tokens the
 * dashboard knows are returned, so a cookie that was edited, truncated or planted by another
 * application on the same host cannot add anything.
 */
export function parseFlagCookie(cookies: string | null | undefined, knownTokens: readonly string[]): string[] {
  for (const part of (cookies ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1 || part.slice(0, separator).trim() !== FLAG_COOKIE_NAME) {
      continue;
    }
    const value = part.slice(separator + 1).trim();
    if (value.length > MAX_COOKIE_VALUE_LENGTH) {
      return [];
    }
    return value.split(TOKEN_SEPARATOR).filter((token) => knownTokens.includes(token));
  }
  return [];
}

/**
 * The cookie is a list of flag names and nothing else. It is host-wide on purpose, because
 * cookies ignore the port, and it cannot be HttpOnly because the page itself writes it.
 */
export function formatFlagCookie(tokens: readonly string[]): string {
  const unique = [...new Set(tokens)];
  return `${FLAG_COOKIE_NAME}=${unique.join(TOKEN_SEPARATOR)}; Path=/; Max-Age=${FLAG_COOKIE_MAX_AGE_SECONDS}; SameSite=Strict`;
}

/** The language the person chose, or null when the cookie holds no choice. */
export function languageFromTokens(tokens: readonly string[]): Lang | null {
  return languages.find((lang) => tokens.includes(LANGUAGE_TOKENS[lang])) ?? null;
}

/** The tokens with the language replaced by another, so that only one choice is ever kept. */
export function withLanguage(tokens: readonly string[], lang: Lang): string[] {
  const choices = Object.values(LANGUAGE_TOKENS);
  return [...tokens.filter((token) => !choices.includes(token)), LANGUAGE_TOKENS[lang]];
}

/** Reads the language out of the value of the cookie, as the server receives it. */
export function languageFromCookieValue(value: string | undefined): Lang | null {
  return languageFromTokens(parseFlagCookie(`${FLAG_COOKIE_NAME}=${value ?? ''}`, Object.values(LANGUAGE_TOKENS)));
}
