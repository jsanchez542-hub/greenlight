import { describe, expect, it } from 'vitest';
import {
  FLAG_COOKIE_MAX_AGE_SECONDS,
  FLAG_COOKIE_NAME,
  formatFlagCookie,
  parseFlagCookie,
} from '@/lib/flag-cookie';
import { visibleState } from '@/lib/onboarding';
import {
  CONNECT_HINT_FLAG,
  FLAG_TOKENS,
  WATCH_TIP_FLAG,
  WELCOME_FLAG,
  WELCOME_SKIPPED_FLAG,
  copyStoredFlagsToCookie,
  isFlagSet,
  setFlag,
  type FlagSources,
} from '@/lib/stored-flag';

const known = Object.values(FLAG_TOKENS);

function browser(options: { storage?: Record<string, string>; cookie?: string; storageThrows?: boolean; cookieThrows?: boolean } = {}) {
  const data = new Map(Object.entries(options.storage ?? {}));
  const state = { cookie: options.cookie ?? '', writes: [] as string[] };
  const sources: FlagSources = {
    storage: {
      getItem: (key) => {
        if (options.storageThrows) {
          throw new Error('blocked');
        }
        return data.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (options.storageThrows) {
          throw new Error('blocked');
        }
        data.set(key, value);
      },
    },
    readCookies: () => {
      if (options.cookieThrows) {
        throw new Error('blocked');
      }
      return state.cookie;
    },
    writeCookie: (cookie) => {
      if (options.cookieThrows) {
        throw new Error('blocked');
      }
      state.writes.push(cookie);
      const value = cookie.split(';')[0] ?? '';
      state.cookie = value;
    },
  };
  return { sources, data, state };
}

describe('the interface cookie', () => {
  it('is a host-wide, strict, one year list of flag names and nothing else', () => {
    const cookie = formatFlagCookie(['welcome-v1', 'watch-tip-v1']);

    expect(cookie).toBe(
      `${FLAG_COOKIE_NAME}=welcome-v1.watch-tip-v1; Path=/; Max-Age=${FLAG_COOKIE_MAX_AGE_SECONDS}; SameSite=Strict`,
    );
    expect(FLAG_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
    expect(cookie).not.toMatch(/Domain=|HttpOnly|Secure/i);
  });

  it('never writes the same flag twice', () => {
    expect(formatFlagCookie(['welcome-v1', 'welcome-v1'])).toContain('=welcome-v1;');
  });

  it('is read out of a cookie string with other cookies around it', () => {
    const header = 'theme=dark; greenlight_ui=welcome-v1.watch-tip-v1; other=1';
    expect(parseFlagCookie(header, known)).toEqual(['welcome-v1', 'watch-tip-v1']);
  });

  it('keeps only names it knows, so another application on the host cannot add anything', () => {
    expect(parseFlagCookie('greenlight_ui=welcome-v1.admin.__proto__.<script>', known)).toEqual(['welcome-v1']);
  });

  it('is empty when missing, malformed or absurdly long', () => {
    expect(parseFlagCookie('', known)).toEqual([]);
    expect(parseFlagCookie(null, known)).toEqual([]);
    expect(parseFlagCookie('greenlight_ui', known)).toEqual([]);
    expect(parseFlagCookie(`greenlight_ui=${'welcome-v1.'.repeat(100)}`, known)).toEqual([]);
    expect(parseFlagCookie('xgreenlight_ui=welcome-v1', known)).toEqual([]);
  });
});

describe('a flag set in either place', () => {
  it('is seen when only the browser storage holds it', () => {
    const { sources } = browser({ storage: { [WELCOME_FLAG]: '1' } });
    expect(isFlagSet(WELCOME_FLAG, sources)).toBe(true);
  });

  it('is seen when only the cookie holds it, which is what another port of the same host has', () => {
    const { sources } = browser({ cookie: 'greenlight_ui=welcome-v1' });
    expect(isFlagSet(WELCOME_FLAG, sources)).toBe(true);
    expect(isFlagSet(WATCH_TIP_FLAG, sources)).toBe(false);
  });

  it('is not seen for a new visitor', () => {
    expect(isFlagSet(WELCOME_FLAG, browser().sources)).toBe(false);
  });

  it('is written to both places', () => {
    const { sources, data, state } = browser();

    setFlag(WELCOME_FLAG, sources);

    expect(data.get(WELCOME_FLAG)).toBe('1');
    expect(state.cookie).toBe('greenlight_ui=welcome-v1');
  });

  it('adds to the cookie without dropping what is already there', () => {
    const { sources, state } = browser({ cookie: 'greenlight_ui=welcome-v1' });

    setFlag(WELCOME_SKIPPED_FLAG, sources);
    setFlag(CONNECT_HINT_FLAG, sources);

    expect(state.cookie).toBe('greenlight_ui=welcome-v1.welcome-skipped-v1.connect-hint-v1');
  });

  it('still works from the cookie when the browser storage is blocked', () => {
    const { sources, state } = browser({ storageThrows: true });

    setFlag(WELCOME_FLAG, sources);

    expect(state.cookie).toBe('greenlight_ui=welcome-v1');
    expect(isFlagSet(WELCOME_FLAG, sources)).toBe(true);
  });

  it('still works from the storage when cookies are blocked', () => {
    const { sources, data } = browser({ cookieThrows: true });

    expect(() => setFlag(WELCOME_FLAG, sources)).not.toThrow();

    expect(data.get(WELCOME_FLAG)).toBe('1');
    expect(isFlagSet(WELCOME_FLAG, sources)).toBe(true);
  });

  it('treats a visitor with both blocked as new and never throws', () => {
    const { sources } = browser({ storageThrows: true, cookieThrows: true });

    expect(isFlagSet(WELCOME_FLAG, sources)).toBe(false);
    expect(() => setFlag(WELCOME_FLAG, sources)).not.toThrow();
  });

  it('ignores a stored value that is not the flag value', () => {
    const { sources } = browser({ storage: { [WELCOME_FLAG]: 'yes' } });
    expect(isFlagSet(WELCOME_FLAG, sources)).toBe(false);
  });

  it('keeps a key that has no cookie name out of the cookie', () => {
    const { sources, state } = browser();

    setFlag('greenlight.other.v1', sources);

    expect(state.writes).toEqual([]);
  });
});

describe('copyStoredFlagsToCookie', () => {
  it('lets someone who saw the welcome before the cookie existed keep it on another port', () => {
    const { sources, state } = browser({ storage: { [WELCOME_FLAG]: '1', [CONNECT_HINT_FLAG]: '1' } });

    copyStoredFlagsToCookie(sources);

    expect(state.cookie).toBe('greenlight_ui=welcome-v1.connect-hint-v1');
  });

  it('writes nothing when the cookie already holds everything', () => {
    const { sources, state } = browser({ storage: { [WELCOME_FLAG]: '1' }, cookie: 'greenlight_ui=welcome-v1' });

    copyStoredFlagsToCookie(sources);

    expect(state.writes).toEqual([]);
  });

  it('writes nothing for a new visitor', () => {
    const { sources, state } = browser();
    copyStoredFlagsToCookie(sources);
    expect(state.writes).toEqual([]);
  });
});

describe('the welcome is shown once', () => {
  it('shows to a new visitor', () => {
    expect(visibleState({ phase: 'closed' }, false)).toEqual({ phase: 'welcome' });
  });

  it('stays up after showing it has marked it as seen, until it is dismissed', () => {
    expect(visibleState({ phase: 'closed' }, true, true)).toEqual({ phase: 'welcome' });
  });

  it('does not show again once seen and dismissed, or when the page is reloaded', () => {
    expect(visibleState({ phase: 'closed' }, true, false)).toEqual({ phase: 'closed' });
  });

  it('never replaces the tour that is running', () => {
    expect(visibleState({ phase: 'tour', step: 1 }, true, true)).toEqual({ phase: 'tour', step: 1 });
  });
});
