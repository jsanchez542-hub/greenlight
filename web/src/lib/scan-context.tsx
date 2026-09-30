'use client';

import type { ScanResult } from 'greenlight';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useScanView, type ScanView } from './use-scan-view';

interface ScanControls {
  view: ScanView;
  liveAvailable: boolean;
  showDemo: () => void;
  startScan: () => void;
}

const ControlsContext = createContext<ScanControls | null>(null);
const ResultContext = createContext<ScanResult | null>(null);

function resultOf(view: ScanView, demo: ScanResult): ScanResult | null {
  if (view.kind === 'demo') {
    return demo;
  }
  return view.kind === 'live' ? view.result : null;
}

interface ScanProviderProps {
  demo: ScanResult;
  liveAvailable: boolean;
  children: ReactNode;
}

export function ScanProvider({ demo, liveAvailable, children }: ScanProviderProps) {
  const { view, showDemo, startScan } = useScanView();
  const controls = useMemo(
    () => ({ view, liveAvailable, showDemo, startScan }),
    [view, liveAvailable, showDemo, startScan],
  );

  return (
    <ControlsContext value={controls}>
      <ResultContext value={resultOf(view, demo)}>{children}</ResultContext>
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
