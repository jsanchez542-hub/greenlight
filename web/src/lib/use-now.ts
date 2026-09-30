'use client';

import { useSyncExternalStore } from 'react';

const TICK_MS = 15_000;

function subscribe(listener: () => void): () => void {
  const timer = setInterval(listener, TICK_MS);
  return () => clearInterval(timer);
}

function getSnapshot(): number {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

function getServerSnapshot(): null {
  return null;
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
