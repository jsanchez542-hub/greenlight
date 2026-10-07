import { describe, expect, it } from 'vitest';
import { parseLang, resolveLang } from '../../src/i18n/index.js';

const none = (): string | undefined => undefined;

describe('parseLang', () => {
  it('recognises a language however the system writes it', () => {
    expect(parseLang('es')).toBe('es');
    expect(parseLang('es-CO')).toBe('es');
    expect(parseLang('es_ES.UTF-8')).toBe('es');
    expect(parseLang('EN-gb')).toBe('en');
    expect(parseLang('en_US.UTF-8')).toBe('en');
  });

  it('says nothing for a language that is not offered, so the caller keeps looking', () => {
    expect(parseLang('fr')).toBeNull();
    expect(parseLang('C')).toBeNull();
    expect(parseLang('')).toBeNull();
    expect(parseLang(undefined)).toBeNull();
  });
});

describe('resolveLang', () => {
  it('prefers the explicit setting over the system', () => {
    expect(resolveLang({ GREENLIGHT_LANG: 'es', LANG: 'en_US.UTF-8' }, () => 'en-US')).toBe('es');
    expect(resolveLang({ GREENLIGHT_LANG: 'en' }, () => 'es-ES')).toBe('en');
  });

  it('falls back to the locale variables, then to the language of the computer', () => {
    expect(resolveLang({ LANG: 'es_ES.UTF-8' }, none)).toBe('es');
    expect(resolveLang({ LC_ALL: 'es_MX.UTF-8', LANG: 'en_US.UTF-8' }, none)).toBe('es');
    expect(resolveLang({ LANG: 'C.UTF-8' }, () => 'es-CO')).toBe('es');
    expect(resolveLang({}, () => 'es-CO')).toBe('es');
  });

  it('is English when nothing says otherwise, and never throws', () => {
    expect(resolveLang({}, none)).toBe('en');
    expect(resolveLang({ GREENLIGHT_LANG: 'klingon' }, () => 'fr-FR')).toBe('en');
    expect(
      resolveLang({}, () => {
        throw new Error('no Intl');
      }),
    ).toBe('en');
  });
});
