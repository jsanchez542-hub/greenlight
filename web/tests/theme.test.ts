import { describe, expect, it } from 'vitest';
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  effectiveTheme,
  nextThemePreference,
  parseThemePreference,
  readThemePreference,
  themeButtonLabel,
  writeThemePreference,
} from '@/lib/theme';

describe('parseThemePreference', () => {
  it('accepts the three known values', () => {
    expect(parseThemePreference('system')).toBe('system');
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('dark')).toBe('dark');
  });

  it('falls back to following the system for anything else', () => {
    expect(parseThemePreference(null)).toBe('system');
    expect(parseThemePreference('')).toBe('system');
    expect(parseThemePreference('sepia')).toBe('system');
    expect(parseThemePreference('DARK')).toBe('system');
  });
});

describe('nextThemePreference', () => {
  it('cycles system, light, dark and back', () => {
    expect(nextThemePreference('system')).toBe('light');
    expect(nextThemePreference('light')).toBe('dark');
    expect(nextThemePreference('dark')).toBe('system');
  });
});

describe('effectiveTheme', () => {
  it('follows the system only when asked to', () => {
    expect(effectiveTheme('system', true)).toBe('dark');
    expect(effectiveTheme('system', false)).toBe('light');
  });

  it('lets a forced theme win in both directions', () => {
    expect(effectiveTheme('light', true)).toBe('light');
    expect(effectiveTheme('dark', false)).toBe('dark');
  });
});

describe('theme storage', () => {
  function memory() {
    const data = new Map<string, string>();
    return {
      data,
      storage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
      },
    };
  }

  it('reads back what was written', () => {
    const { storage } = memory();
    writeThemePreference(storage, 'dark');
    expect(readThemePreference(storage)).toBe('dark');
  });

  it('uses a versioned key', () => {
    expect(THEME_STORAGE_KEY).toMatch(/\.v\d+$/);
  });

  it('treats an invalid stored value as system', () => {
    const { data, storage } = memory();
    data.set(THEME_STORAGE_KEY, 'neon');
    expect(readThemePreference(storage)).toBe('system');
  });

  it('survives storage that throws, or none at all', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readThemePreference(blocked)).toBe('system');
    expect(() => writeThemePreference(blocked, 'dark')).not.toThrow();
    expect(readThemePreference(undefined)).toBe('system');
    expect(() => writeThemePreference(undefined, 'dark')).not.toThrow();
  });
});

describe('themeButtonLabel', () => {
  it('names the current state and the next one', () => {
    expect(themeButtonLabel('light', false)).toBe('Theme: Light. Switch to Dark.');
    expect(themeButtonLabel('dark', true)).toBe('Theme: Dark. Switch to System.');
  });

  it('says what the system currently is when following it', () => {
    expect(themeButtonLabel('system', true)).toBe('Theme: System, currently dark. Switch to Light.');
    expect(themeButtonLabel('system', false)).toBe('Theme: System, currently light. Switch to Light.');
  });

  it('does not guess the system theme before it is known', () => {
    expect(themeButtonLabel('system', null)).toBe('Theme: System. Switch to Light.');
  });
});

describe('the script that runs before the first paint', () => {
  function run(stored: string | null | 'throws') {
    const root = { dataset: {} as Record<string, string> };
    const localStorage = {
      getItem: () => {
        if (stored === 'throws') {
          throw new Error('blocked');
        }
        return stored;
      },
    };
    new Function('localStorage', 'document', THEME_INIT_SCRIPT)(localStorage, { documentElement: root });
    return root.dataset['theme'];
  }

  it('applies a forced theme', () => {
    expect(run('dark')).toBe('dark');
    expect(run('light')).toBe('light');
  });

  it('leaves the system theme alone', () => {
    expect(run('system')).toBeUndefined();
    expect(run(null)).toBeUndefined();
  });

  it('ignores a value it does not know', () => {
    expect(run('neon')).toBeUndefined();
  });

  it('does not break the page when storage is blocked', () => {
    expect(() => run('throws')).not.toThrow();
    expect(run('throws')).toBeUndefined();
  });
});
