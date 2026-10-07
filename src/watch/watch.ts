import type { Severity } from '../analysis/types.js';
import { messagesFor, type Lang } from '../i18n/index.js';
import type { ScanResult } from '../scan.js';
import { atLeast, trackFindings } from './findings.js';
import {
  buildFailureAlert,
  buildFindingsAlert,
  buildRecoveryAlert,
  type AlertPayload,
} from './notify.js';
import type { StateStore, WatchState } from './state.js';

export interface WatchOptions {
  notifyMinimum: Severity;
  clearAfterScans: number;
  failureThreshold: number;
}

export const defaultWatchOptions: WatchOptions = {
  notifyMinimum: 'warning',
  clearAfterScans: 2,
  failureThreshold: 3,
};

export interface WatchDependencies {
  scan: () => Promise<ScanResult>;
  store: StateStore;
  /** null when no webhook is configured: changes are then only written to the log. */
  deliver: ((payload: AlertPayload) => Promise<void>) | null;
  instance: string;
  options: WatchOptions;
  log: (line: string) => void;
  warn: (line: string) => void;
  now?: () => Date;
  /** The language of the log lines and of the alerts. */
  lang?: Lang;
  /** Runs before every scan of a long-lived watcher. It must never throw. */
  beforeCycle?: () => Promise<void>;
}

export interface CycleOutcome {
  status: 'scanned' | 'scan-failed';
  openFindings: number;
  added: number;
  resolved: number;
  /** false when an alert could not be delivered; it is retried on the next cycle. */
  delivered: boolean;
}

function describe(error: unknown, lang: Lang): string {
  return error instanceof Error ? error.message : messagesFor(lang).cli.unknownError;
}

async function send(
  deps: WatchDependencies,
  payload: AlertPayload,
): Promise<boolean> {
  if (deps.deliver === null) {
    return true;
  }
  try {
    await deps.deliver(payload);
    return true;
  } catch (error) {
    const lang = deps.lang ?? 'en';
    deps.warn(messagesFor(lang).watch.notDelivered(describe(error, lang)));
    return false;
  }
}

async function handleFailure(
  deps: WatchDependencies,
  state: WatchState,
  error: unknown,
  at: string,
): Promise<CycleOutcome> {
  const failures = state.consecutiveFailures + 1;
  const lang = deps.lang ?? 'en';
  deps.warn(messagesFor(lang).watch.scanFailed(failures, describe(error, lang)));

  let degraded = state.degraded;
  let delivered = true;
  if (!degraded && failures >= deps.options.failureThreshold) {
    delivered = await send(deps, buildFailureAlert(deps.instance, at, failures, lang));
    degraded = delivered;
  }

  deps.store.save({ ...state, consecutiveFailures: failures, degraded });
  return { status: 'scan-failed', openFindings: 0, added: 0, resolved: 0, delivered };
}

export async function runCycle(deps: WatchDependencies): Promise<CycleOutcome> {
  const lang = deps.lang ?? 'en';
  const t = messagesFor(lang).watch;
  const state = deps.store.load();
  const at = (deps.now?.() ?? new Date()).toISOString();

  let result: ScanResult;
  try {
    result = await deps.scan();
  } catch (error) {
    return handleFailure(deps, state, error, at);
  }

  const changes = trackFindings(state.tracker, result.findings, deps.options.clearAfterScans);
  const added = changes.added.filter((finding) => atLeast(finding.severity, deps.options.notifyMinimum));
  const resolved = changes.resolved.filter((finding) =>
    atLeast(finding.severity, deps.options.notifyMinimum),
  );

  // Everything that follows is recorded step by step, so an alert that fails to go out is
  // simply computed again next cycle instead of being lost.
  let current: WatchState = { ...state, consecutiveFailures: 0, degraded: false };

  if (state.degraded) {
    if (!(await send(deps, buildRecoveryAlert(deps.instance, at, lang)))) {
      return { status: 'scanned', openFindings: result.findings.length, added: 0, resolved: 0, delivered: false };
    }
    deps.store.save(current);
  }

  let delivered = true;
  if (added.length > 0 || resolved.length > 0) {
    for (const finding of added) {
      deps.log(t.newFinding(messagesFor(lang).alert.severity[finding.severity], finding.workflowName, finding.detector));
    }
    for (const finding of resolved) {
      deps.log(t.resolvedFinding(finding.workflowName, finding.detector));
    }
    delivered = await send(
      deps,
      buildFindingsAlert({ instance: deps.instance, scannedAt: result.scannedAt, added, resolved, lang }),
    );
  }

  if (delivered) {
    current = { ...current, tracker: changes.tracked };
  }
  deps.store.save(current);

  deps.log(t.cycle(result.workflowsScanned, result.findings.length, added.length, resolved.length));
  return {
    status: 'scanned',
    openFindings: result.findings.length,
    added: added.length,
    resolved: resolved.length,
    delivered,
  };
}

export type Sleep = (milliseconds: number, signal: AbortSignal) => Promise<void>;

export const sleep: Sleep = (milliseconds, signal) =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(done, milliseconds);
    signal.addEventListener('abort', done, { once: true });

    function done(): void {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
  });

export async function watch(
  deps: WatchDependencies,
  intervalMs: number,
  signal: AbortSignal,
  wait: Sleep = sleep,
): Promise<void> {
  while (!signal.aborted) {
    await deps.beforeCycle?.();
    await runCycle(deps);
    await wait(intervalMs, signal);
  }
}
