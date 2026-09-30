'use client';

import type { ScanResult } from 'greenlight';
import { useCallback, useEffect, useRef, useState } from 'react';
import { requestLiveScan } from './scan-client';

export type ScanView =
  | { kind: 'demo' }
  | { kind: 'scanning'; startedAt: number }
  | { kind: 'failed'; message: string }
  | { kind: 'live'; result: ScanResult };

export function useScanView() {
  const [view, setView] = useState<ScanView>({ kind: 'demo' });
  const pending = useRef<AbortController | null>(null);

  const showDemo = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    setView({ kind: 'demo' });
  }, []);

  const startScan = useCallback(async () => {
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setView({ kind: 'scanning', startedAt: Date.now() });

    try {
      setView({ kind: 'live', result: await requestLiveScan(request.signal) });
    } catch (error) {
      if (!request.signal.aborted) {
        setView({
          kind: 'failed',
          message: error instanceof Error ? error.message : 'The scan failed for an unknown reason.',
        });
      }
    }
  }, []);

  useEffect(() => () => pending.current?.abort(), []);

  return { view, showDemo, startScan };
}
