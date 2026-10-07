'use client';

import type { ScanResult } from 'greenlight';
import type { ReactNode } from 'react';
import { ControlsContext, ResultContext, type ScanControls } from './scan-context';

const nothing = (): void => undefined;

const CONTROLS: ScanControls = {
  source: 'sample',
  liveAvailable: false,
  phase: 'ready',
  problem: null,
  refreshing: false,
  intervalMinutes: null,
  host: null,
  settingsProblem: null,
  selectLive: nothing,
  connectLive: nothing,
  disconnectLive: nothing,
  selectSample: nothing,
  scanNow: nothing,
};

/** The scan context of a page that has no instance to read: it always holds the sample and never reaches out. */
export function SampleScanProvider({ sample, children }: { sample: ScanResult; children: ReactNode }) {
  return (
    <ControlsContext value={CONTROLS}>
      <ResultContext value={sample}>{children}</ResultContext>
    </ControlsContext>
  );
}
