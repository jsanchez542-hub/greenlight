import type { Severity } from '../analysis/types.js';
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
}

export interface CycleOutcome {
  status: 'scanned' | 'scan-failed';
  openFindings: number;
  added: number;
  resolved: number;
  /** false when an alert could not be delivered; it is retried on the next cycle. */
  delivered: boolean;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
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
    deps.warn(`Alert not delivered, will retry on the next scan: ${describe(error)}`);
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
  deps.warn(`Scan failed (${failures} in a row): ${describe(error)}`);

  let degraded = state.degraded;
  let delivered = true;
  if (!degraded && failures >= deps.options.failureThreshold) {
    delivered = await send(deps, buildFailureAlert(deps.instance, at, failures));
    degraded = delivered;
  }

  deps.store.save({ ...state, consecutiveFailures: failures, degraded });
  return { status: 'scan-failed', openFindings: 0, added: 0, resolved: 0, delivered };
}

export async function runCycle(deps: WatchDependencies): Promise<CycleOutcome> {
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
    if (!(await send(deps, buildRecoveryAlert(deps.instance, at)))) {
      return { status: 'scanned', openFindings: result.findings.length, added: 0, resolved: 0, delivered: false };
    }
    deps.store.save(current);
  }

  let delivered = true;
  if (added.length > 0 || resolved.length > 0) {
    for (const finding of added) {
      deps.log(`NEW ${finding.severity.toUpperCase()} ${finding.workflowName} (${finding.detector})`);
    }
    for (const finding of resolved) {
      deps.log(`RESOLVED ${finding.workflowName} (${finding.detector})`);
    }
    delivered = await send(
      deps,
      buildFindingsAlert({ instance: deps.instance, scannedAt: result.scannedAt, added, resolved }),
    );
  }

  if (delivered) {
    current = { ...current, tracker: changes.tracked };
  }
  deps.store.save(current);

  deps.log(
    `Scanned ${result.workflowsScanned} workflows: ${result.findings.length} open, ${added.length} new, ${resolved.length} resolved.`,
  );
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
    await runCycle(deps);
    await wait(intervalMs, signal);
  }
}
