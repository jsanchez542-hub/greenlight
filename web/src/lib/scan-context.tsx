'use client';

import type { ScanResult } from 'greenlight';
import { createContext, useContext } from 'react';
import type { FailureCode } from './failure';

export type Source = 'live' | 'sample';
export type Phase = 'ready' | 'connecting' | 'failed';

export interface ScanControls {
  source: Source;
  liveAvailable: boolean;
  phase: Phase;
  problem: FailureCode | null;
  refreshing: boolean;
  intervalMinutes: number | null;
  host: string | null;
  settingsProblem: FailureCode | null;
  selectLive: () => void;
  connectLive: () => void;
  disconnectLive: () => void;
  selectSample: () => void;
  scanNow: () => void;
}

export const ControlsContext = createContext<ScanControls | null>(null);
export const ResultContext = createContext<ScanResult | null>(null);

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
