import { formatFlagCookie, parseFlagCookie } from './flag-cookie';

export const WELCOME_FLAG = 'greenlight.welcome.v1';
export const WATCH_TIP_FLAG = 'greenlight.watch-tip.v1';
export const WELCOME_SKIPPED_FLAG = 'greenlight.welcome-skipped.v1';
export const CONNECT_HINT_FLAG = 'greenlight.connect-hint.v1';

export const FLAG_TOKENS: Record<string, string> = {
  [WELCOME_FLAG]: 'welcome-v1',
  [WATCH_TIP_FLAG]: 'watch-tip-v1',
  [WELCOME_SKIPPED_FLAG]: 'welcome-skipped-v1',
  [CONNECT_HINT_FLAG]: 'connect-hint-v1',
};

const KNOWN_TOKENS = Object.values(FLAG_TOKENS);

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function readFlag(storage: ReadableStorage | undefined, key: string): boolean {
  try {
    return storage?.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeFlag(storage: WritableStorage | undefined, key: string): void {
  try {
    storage?.setItem(key, '1');
  } catch {
    return;
  }
}

export interface FlagSources {
  storage: (ReadableStorage & WritableStorage) | undefined;
  readCookies: () => string;
  writeCookie: (cookie: string) => void;
}

function cookieTokens(sources: FlagSources): string[] {
  try {
    return parseFlagCookie(sources.readCookies(), KNOWN_TOKENS);
  } catch {
    return [];
  }
}

/** A flag counts as set when either the browser storage or the interface cookie says so. */
export function isFlagSet(key: string, sources: FlagSources): boolean {
  const token = FLAG_TOKENS[key];
  return readFlag(sources.storage, key) || (token !== undefined && cookieTokens(sources).includes(token));
}

function writeCookieTokens(tokens: readonly string[], sources: FlagSources): void {
  try {
    sources.writeCookie(formatFlagCookie(tokens));
  } catch {
    return;
  }
}

export function setFlag(key: string, sources: FlagSources): void {
  writeFlag(sources.storage, key);
  const token = FLAG_TOKENS[key];
  if (token !== undefined) {
    writeCookieTokens([...cookieTokens(sources), token], sources);
  }
}

/**
 * Flags that were set before the cookie existed live only in the browser storage of one
 * address. Copying them into the cookie lets the same person on another port keep them.
 */
export function copyStoredFlagsToCookie(sources: FlagSources): void {
  const present = cookieTokens(sources);
  const stored = Object.entries(FLAG_TOKENS)
    .filter(([key]) => readFlag(sources.storage, key))
    .map(([, token]) => token);
  const missing = stored.filter((token) => !present.includes(token));
  if (missing.length > 0) {
    writeCookieTokens([...present, ...missing], sources);
  }
}
