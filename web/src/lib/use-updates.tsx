'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ApiFailure, failureCodeOf } from './failure';
import { fetchUpdateState, requestUpdateChoice } from './update-client';
import { readDismissedUpdate, updateNotice, writeDismissedUpdate, type UpdateState } from './update-notice';
import { UpdatesContext, type ChoicePhase, type UpdatesApi } from './updates-context';

const dismissals = new Set<() => void>();

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function subscribeToDismissals(listener: () => void): () => void {
  dismissals.add(listener);
  return () => dismissals.delete(listener);
}

function currentDismissal(): string | null {
  return readDismissedUpdate(browserStorage());
}

function noDismissalOnTheServer(): string | null {
  return null;
}

export function UpdatesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpdateState | null>(null);
  const dismissed = useSyncExternalStore(subscribeToDismissals, currentDismissal, noDismissalOnTheServer);
  const [phase, setPhase] = useState<ChoicePhase>('idle');
  const [problem, setProblem] = useState<UpdatesApi['problem']>(null);
  const [overridden, setOverridden] = useState(false);
  const mounted = useRef(true);

  const reload = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController();

    async function load() {
      try {
        const next = await fetchUpdateState(abort.signal);
        setState(next);
      } catch {
        return;
      }
    }

    reload.current = load;
    void load();
    return () => {
      mounted.current = false;
      abort.abort();
    };
  }, []);

  const dismiss = useCallback(() => {
    if (state?.enabled === true && state.latest !== null) {
      writeDismissedUpdate(browserStorage(), state.latest);
      dismissals.forEach((listener) => listener());
    }
  }, [state]);

  const choose = useCallback(
    async (enabled: boolean) => {
      setPhase('saving');
      setProblem(null);
      try {
        const result = await requestUpdateChoice(enabled, new AbortController().signal);
        setOverridden(result.notice === 'processEnv');
        await reload.current();
        if (mounted.current) {
          setPhase('saved');
        }
      } catch (failure) {
        if (mounted.current) {
          setProblem({ code: failureCodeOf(failure), seconds: failure instanceof ApiFailure ? failure.seconds : null });
          setPhase('failed');
        }
      }
    },
    [],
  );

  const refresh = useCallback(() => reload.current(), []);

  const value = useMemo<UpdatesApi>(
    () => ({
      state,
      notice: updateNotice(state, dismissed),
      dismiss,
      choose,
      refresh,
      phase,
      problem,
      overridden,
    }),
    [state, dismissed, dismiss, choose, refresh, phase, problem, overridden],
  );

  return <UpdatesContext value={value}>{children}</UpdatesContext>;
}
