'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveSnapshot } from './live-snapshot';
import { RefreshRefusedError, fetchSnapshot, requestScan } from './snapshot-client';

const IDLE_POLL_MS = 10_000;
const BUSY_POLL_MS = 2_000;

export interface LiveFeed {
  snapshot: LiveSnapshot | null;
  transportError: string | null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The dashboard server did not answer.';
}

export function useLiveFeed(enabled: boolean, initial: LiveSnapshot | null) {
  const [feed, setFeed] = useState<LiveFeed>({ snapshot: initial, transportError: null });
  const restart = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (document.hidden) {
        timer = setTimeout(poll, IDLE_POLL_MS);
        return;
      }
      try {
        const snapshot = await fetchSnapshot(abort.signal);
        setFeed({ snapshot, transportError: null });
        timer = setTimeout(poll, snapshot.refreshing ? BUSY_POLL_MS : IDLE_POLL_MS);
      } catch (error) {
        if (!abort.signal.aborted) {
          setFeed((previous) => ({ ...previous, transportError: messageOf(error) }));
          timer = setTimeout(poll, IDLE_POLL_MS);
        }
      }
    }

    function restartNow() {
      clearTimeout(timer);
      void poll();
    }

    restart.current = restartNow;
    document.addEventListener('visibilitychange', restartNow);
    void poll();

    return () => {
      abort.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', restartNow);
    };
  }, [enabled]);

  const scanNow = useCallback(async () => {
    try {
      const snapshot = await requestScan(new AbortController().signal);
      setFeed({ snapshot, transportError: null });
    } catch (error) {
      if (!(error instanceof RefreshRefusedError)) {
        setFeed((previous) => ({ ...previous, transportError: messageOf(error) }));
      }
    }
    restart.current();
  }, []);

  return { feed, scanNow };
}
