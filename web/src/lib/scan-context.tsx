'use client';

import type { ScanResult } from 'greenlight';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { LiveSnapshot } from './live-snapshot';
import { useLiveFeed } from './use-live-feed';

export type Source = 'live' | 'sample';
export type Phase = 'ready' | 'connecting' | 'failed';

interface ScanControls {
  source: Source;
  liveAvailable: boolean;
  phase: Phase;
  problem: string | null;
  refreshing: boolean;
  intervalMinutes: number | null;
  host: string | null;
  settingsProblem: string | null;
  selectLive: () => void;
  connectLive: () => void;
  selectSample: () => void;
  scanNow: () => void;
}

const ControlsContext = createContext<ScanControls | null>(null);
const ResultContext = createContext<ScanResult | null>(null);

interface ScanProviderProps {
  sample: ScanResult;
  liveAvailable: boolean;
  settingsProblem: string | null;
  initialSnapshot: LiveSnapshot | null;
  children: ReactNode;
}

export function ScanProvider({
  sample,
  liveAvailable,
  settingsProblem,
  initialSnapshot,
  children,
}: ScanProviderProps) {
  const [source, setSource] = useState<Source>(liveAvailable ? 'live' : 'sample');
  const [connected, setConnected] = useState(false);
  const available = liveAvailable || connected;
  const { feed, scanNow } = useLiveFeed(available && source === 'live', initialSnapshot);

  const live = source === 'live';
  const result = live ? (feed.snapshot?.result ?? null) : sample;
  const problem = live ? (feed.transportError ?? feed.snapshot?.error ?? null) : null;

  let phase: Phase = 'ready';
  if (result === null) {
    phase = problem === null ? 'connecting' : 'failed';
  }

  const controls = useMemo<ScanControls>(
    () => ({
      source,
      liveAvailable: available,
      phase,
      problem,
      refreshing: live && (feed.snapshot?.refreshing ?? false),
      intervalMinutes: live ? (feed.snapshot?.intervalMinutes ?? null) : null,
      host: feed.snapshot?.host ?? null,
      settingsProblem,
      selectLive: () => setSource('live'),
      connectLive: () => {
        setConnected(true);
        setSource('live');
      },
      selectSample: () => setSource('sample'),
      scanNow: () => void scanNow(),
    }),
    [source, available, phase, problem, live, feed.snapshot, scanNow, settingsProblem],
  );

  return (
    <ControlsContext value={controls}>
      <ResultContext value={result}>{children}</ResultContext>
    </ControlsContext>
  );
}

export function useScanControls(): ScanControls {
  const controls = useContext(ControlsContext);
  if (controls === null) {
    throw new Error('useScanControls must be used inside ScanProvider.');
  }
  return controls;
}

export function useOptionalResult(): ScanResult | null {
  return useContext(ResultContext);
}

export function useResult(): ScanResult {
  const result = useOptionalResult();
  if (result === null) {
    throw new Error('useResult needs a scan result, which the shell only provides once one exists.');
  }
  return result;
}
