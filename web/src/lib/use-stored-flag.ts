'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { readFlag, writeFlag } from './stored-flag';

const values = new Map<string, boolean>();
const listeners = new Set<() => void>();

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot(): boolean {
  return true;
}

export function useStoredFlag(key: string): [boolean, () => void] {
  const getSnapshot = useCallback((): boolean => {
    if (!values.has(key)) {
      values.set(key, readFlag(browserStorage(), key));
    }
    return values.get(key) ?? false;
  }, [key]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(() => {
    values.set(key, true);
    writeFlag(browserStorage(), key);
    listeners.forEach((listener) => listener());
  }, [key]);

  return [value, set];
}
