'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  THEME_STORAGE_KEY,
  nextThemePreference,
  readThemePreference,
  writeThemePreference,
  type ThemePreference,
} from './theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();
let current: ThemePreference | null = null;

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function apply(preference: ThemePreference): void {
  if (preference === 'system') {
    delete document.documentElement.dataset['theme'];
  } else {
    document.documentElement.dataset['theme'] = preference;
  }
}

function subscribePreference(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      current = readThemePreference(browserStorage());
      apply(current);
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getPreference(): ThemePreference {
  current ??= readThemePreference(browserStorage());
  return current;
}

function getServerPreference(): ThemePreference {
  return 'system';
}

function subscribeSystem(listener: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

function getSystemDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function getServerSystemDark(): null {
  return null;
}

export function useTheme() {
  const preference = useSyncExternalStore(subscribePreference, getPreference, getServerPreference);
  const systemDark = useSyncExternalStore(subscribeSystem, getSystemDark, getServerSystemDark);

  const cycle = useCallback(() => {
    current = nextThemePreference(getPreference());
    writeThemePreference(browserStorage(), current);
    apply(current);
    notify();
  }, []);

  return { preference, systemDark, cycle };
}
