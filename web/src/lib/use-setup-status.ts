'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '@/i18n/context';
import { failureCodeOf, type FailureCode } from './failure';
import { fetchSetupStatus } from './setup-client';
import { pollDelayMs, setupPhase, type SetupStatus } from './setup-status';

const RETRY_MS = 10_000;

export function useSetupStatus() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState<FailureCode | null>(null);
  const lang = useLang();
  const [checking, setChecking] = useState(false);
  const restart = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function run() {
      clearTimeout(timer);
      if (document.hidden) {
        timer = setTimeout(run, RETRY_MS);
        return;
      }
      try {
        const next = await fetchSetupStatus(abort.signal);
        setStatus(next);
        setError(null);
        const delay = pollDelayMs(setupPhase(next));
        if (delay !== null) {
          timer = setTimeout(run, delay);
        }
      } catch (failure) {
        if (!abort.signal.aborted) {
          setError(failureCodeOf(failure));
          timer = setTimeout(run, RETRY_MS);
        }
      }
    }

    function onVisible() {
      if (!document.hidden) {
        void run();
      }
    }

    restart.current = run;
    document.addEventListener('visibilitychange', onVisible);
    void run();

    return () => {
      abort.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [lang]);

  const checkAgain = useCallback(async () => {
    setChecking(true);
    await restart.current();
    setChecking(false);
  }, []);

  return { status, error, checking, checkAgain };
}
