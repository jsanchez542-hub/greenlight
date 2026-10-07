export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'greenlight.theme.v1';

export const themePreferences: readonly ThemePreference[] = ['system', 'light', 'dark'];

export const themeLabel: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function parseThemePreference(raw: string | null): ThemePreference {
  return themePreferences.find((preference) => preference === raw) ?? 'system';
}

export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = themePreferences.indexOf(current);
  return themePreferences[(index + 1) % themePreferences.length] ?? 'system';
}

export function effectiveTheme(preference: ThemePreference, systemPrefersDark: boolean): EffectiveTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return preference;
}

export function readThemePreference(storage: ReadableStorage | undefined): ThemePreference {
  try {
    return parseThemePreference(storage?.getItem(THEME_STORAGE_KEY) ?? null);
  } catch {
    return 'system';
  }
}

export function writeThemePreference(storage: WritableStorage | undefined, preference: ThemePreference): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    return;
  }
}

export function themeButtonLabel(preference: ThemePreference, systemPrefersDark: boolean | null): string {
  const next = nextThemePreference(preference);
  const current =
    preference === 'system' && systemPrefersDark !== null
      ? `System, currently ${effectiveTheme(preference, systemPrefersDark)}`
      : themeLabel[preference];
  return `Theme: ${current}. Switch to ${themeLabel[next]}.`;
}

export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;
