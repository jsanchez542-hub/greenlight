export const FLAG_COOKIE_NAME = 'greenlight_ui';
export const FLAG_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

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
