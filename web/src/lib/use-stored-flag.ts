'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { browserSources } from './browser-sources';
import { copyStoredFlagsToCookie, isFlagSet, setFlag } from './stored-flag';

const values = new Map<string, boolean>();
const listeners = new Set<() => void>();
let copied = false;

function subscribe(listener: () => void): () => void {
  if (!copied) {
    copied = true;
    copyStoredFlagsToCookie(browserSources());
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot(): boolean {
  return true;
}

export function useStoredFlag(key: string): [boolean, () => void] {
  const getSnapshot = useCallback((): boolean => {
    if (!values.has(key)) {
      values.set(key, isFlagSet(key, browserSources()));
    }
    return values.get(key) ?? false;
  }, [key]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(() => {
    values.set(key, true);
    setFlag(key, browserSources());
    listeners.forEach((listener) => listener());
  }, [key]);

  return [value, set];
}
