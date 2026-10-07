import { describe, expect, it } from 'vitest';
import { parseAcceptLanguage, resolveLanguage } from '@/i18n/resolve';
import {
  FLAG_COOKIE_NAME,
  LANGUAGE_TOKENS,
  formatFlagCookie,
  languageFromCookieValue,
  languageFromTokens,
  parseFlagCookie,
  withLanguage,
} from '@/lib/flag-cookie';
import { FLAG_TOKENS, readLanguage, setLanguage, type FlagSources } from '@/lib/stored-flag';

describe('parseAcceptLanguage', () => {
  it('picks the first language GreenLight speaks', () => {
    expect(parseAcceptLanguage('es-CO,es;q=0.9,en;q=0.8')).toBe('es');
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en');
  });

  it('honours the weights, not the order', () => {
    expect(parseAcceptLanguage('en;q=0.4, es;q=0.9')).toBe('es');
    expect(parseAcceptLanguage('fr, es;q=0.2, en;q=0.1')).toBe('es');
  });

  it('keeps the order for equal weights', () => {
    expect(parseAcceptLanguage('en, es')).toBe('en');
  });

  it('ignores languages it does not speak, refused ones and nonsense weights', () => {
    expect(parseAcceptLanguage('fr-FR,de;q=0.8')).toBeNull();
    expect(parseAcceptLanguage('es;q=0, en;q=0.1')).toBe('en');
    expect(parseAcceptLanguage('es;q=abc')).toBe('es');
    expect(parseAcceptLanguage('*')).toBeNull();
  });

  it('says nothing for an empty, missing or absurdly long header', () => {
    expect(parseAcceptLanguage('')).toBeNull();
    expect(parseAcceptLanguage(null)).toBeNull();
    expect(parseAcceptLanguage(undefined)).toBeNull();
    expect(parseAcceptLanguage(`${'fr,'.repeat(600)}es`)).toBeNull();
  });

  it('reads at most a few entries, so a long list cannot hide the answer for long', () => {
    expect(parseAcceptLanguage(`${'fr,'.repeat(30)}es`)).toBeNull();
  });
});

describe('resolveLanguage', () => {
  const none = { cookie: null, setting: undefined, acceptLanguage: null };

  it('falls back to English', () => {
    expect(resolveLanguage(none)).toBe('en');
  });

  it('follows the browser', () => {
    expect(resolveLanguage({ ...none, acceptLanguage: 'es-ES,es;q=0.9' })).toBe('es');
  });

  it('prefers the setting of the installation over the browser', () => {
    expect(resolveLanguage({ ...none, setting: 'en', acceptLanguage: 'es' })).toBe('en');
    expect(resolveLanguage({ ...none, setting: 'es_ES.UTF-8', acceptLanguage: 'en' })).toBe('es');
  });

  it('prefers the choice made in the page over everything', () => {
    expect(resolveLanguage({ cookie: 'en', setting: 'es', acceptLanguage: 'es' })).toBe('en');
    expect(resolveLanguage({ cookie: 'es', setting: 'en', acceptLanguage: 'en' })).toBe('es');
  });

  it('skips a setting it does not understand and keeps looking', () => {
    expect(resolveLanguage({ ...none, setting: 'klingon', acceptLanguage: 'es' })).toBe('es');
    expect(resolveLanguage({ ...none, setting: '', acceptLanguage: null })).toBe('en');
  });
});

describe('the language in the interface cookie', () => {
  it('is one token of the same cookie as the other flags', () => {
    expect(LANGUAGE_TOKENS).toEqual({ en: 'lang-en', es: 'lang-es' });
    expect(FLAG_COOKIE_NAME).toBe('greenlight_ui');
  });

  it('is read out of the value the server receives', () => {
    expect(languageFromCookieValue('lang-es')).toBe('es');
    expect(languageFromCookieValue('welcome-v1.lang-en.watch-tip-v1')).toBe('en');
    expect(languageFromCookieValue('welcome-v1')).toBeNull();
    expect(languageFromCookieValue(undefined)).toBeNull();
    expect(languageFromCookieValue('')).toBeNull();
  });

  it('ignores a language it does not know and anything planted next to it', () => {
    expect(languageFromCookieValue('lang-fr')).toBeNull();
    expect(languageFromCookieValue('lang-<script>.lang-es')).toBe('es');
    expect(languageFromCookieValue(`${'x'.repeat(300)}.lang-es`)).toBeNull();
  });

  it('keeps one choice only when it is replaced', () => {
    expect(withLanguage(['welcome-v1', 'lang-es'], 'en')).toEqual(['welcome-v1', 'lang-en']);
    expect(withLanguage(['lang-en', 'lang-es'], 'es')).toEqual(['lang-es']);
    expect(languageFromTokens(['lang-en'])).toBe('en');
  });

  function sources(initial = ''): FlagSources & { cookie: () => string } {
    let cookie = initial;
    return {
      storage: undefined,
      readCookies: () => cookie,
      writeCookie: (value) => {
        cookie = value.split(';')[0] ?? '';
      },
      cookie: () => cookie,
    };
  }

  it('is written next to the flags without removing them, with the attributes of the cookie', () => {
    const jar = sources(`${FLAG_COOKIE_NAME}=${FLAG_TOKENS['greenlight.welcome.v1']}`);
    setLanguage('es', jar);

    expect(jar.cookie()).toBe(`${FLAG_COOKIE_NAME}=welcome-v1.lang-es`);
    expect(readLanguage(jar)).toBe('es');
    expect(formatFlagCookie(['lang-es'])).toBe(
      'greenlight_ui=lang-es; Path=/; Max-Age=31536000; SameSite=Strict',
    );
  });

  it('is replaced, not added to, when the person changes their mind', () => {
    const jar = sources();
    setLanguage('es', jar);
    setLanguage('en', jar);

    expect(jar.cookie()).toBe(`${FLAG_COOKIE_NAME}=lang-en`);
    expect(parseFlagCookie(jar.cookie(), Object.values(LANGUAGE_TOKENS))).toEqual(['lang-en']);
  });

  it('holds nothing but flag names, so it carries nothing private', () => {
    const jar = sources();
    setLanguage('es', jar);
    expect(jar.cookie()).toMatch(/^greenlight_ui=[a-z0-9.-]+$/);
  });
});
