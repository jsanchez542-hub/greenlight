'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  readSidebarState,
  toggledSidebar,
  writeSidebarState,
  type SidebarState,
} from './sidebar';

const listeners = new Set<() => void>();
let current: SidebarState | null = null;

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

function getSnapshot(): SidebarState {
  current ??= readSidebarState(browserStorage());
  return current;
}

function getServerSnapshot(): SidebarState {
  return 'expanded';
}

export function useSidebar() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    current = toggledSidebar(getSnapshot());
    writeSidebarState(browserStorage(), current);
    listeners.forEach((listener) => listener());
  }, []);

  return { state, toggle };
}
