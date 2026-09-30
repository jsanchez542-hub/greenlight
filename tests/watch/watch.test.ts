import { describe, expect, it } from 'vitest';
import type { Finding } from '../../src/analysis/types.js';
import type { ScanResult } from '../../src/scan.js';
import type { AlertPayload } from '../../src/watch/notify.js';
import { emptyState, type StateStore, type WatchState } from '../../src/watch/state.js';
import {
  defaultWatchOptions,
  runCycle,
  watch,
  type WatchDependencies,
  type WatchOptions,
} from '../../src/watch/watch.js';

const critical: Finding = {
  workflowId: 'wf-1',
  workflowName: 'Order confirmations',
  detector: 'silent-error',
  severity: 'critical',
  summary: '"Send receipt" emitted an error in 5 of the last 5 successful executions.',
  evidence: { node: 'Send receipt', executionsWithError: 5 },
};

const warning: Finding = {
  workflowId: 'wf-2',
  workflowName: 'Inventory sync',
  detector: 'duration-drift',
  severity: 'warning',
  summary: 'Typical run time rose from 1.2s to 10.5s.',
  evidence: { recentMedian: '10.5s' },
};

function scanOf(...findings: Finding[]): ScanResult {
  return {
    version: 1,
    scannedAt: '2026-01-10T12:00:00.000Z',
    workflowsScanned: 18,
    workflows: [],
    findings,
  };
}

class MemoryStore implements StateStore {
  state: WatchState = emptyState();
  load(): WatchState {
    return structuredClone(this.state);
  }
  save(state: WatchState): void {
    this.state = structuredClone(state);
  }
}

interface Harness {
  deps: WatchDependencies;
  store: MemoryStore;
  alerts: AlertPayload[];
  warnings: string[];
  next: (outcome: ScanResult | Error) => void;
}

function harness(options: Partial<WatchOptions> = {}, withWebhook = true, failDelivery = { on: false }): Harness {
  const store = new MemoryStore();
  const alerts: AlertPayload[] = [];
  const warnings: string[] = [];
  const queue: (ScanResult | Error)[] = [];

  const deps: WatchDependencies = {
    scan: async () => {
      const outcome = queue.shift();
      if (outcome === undefined) {
        throw new Error('no scan queued');
      }
      if (outcome instanceof Error) {
        throw outcome;
      }
      return outcome;
    },
    store,
    deliver: withWebhook
      ? async (payload) => {
          if (failDelivery.on) {
            throw new Error('webhook down');
          }
          alerts.push(payload);
        }
      : null,
    instance: 'n8n.example.com',
    options: { ...defaultWatchOptions, ...options },
    log: () => undefined,
    warn: (line) => void warnings.push(line),
    now: () => new Date('2026-01-10T12:00:00.000Z'),
  };

  return { deps, store, alerts, warnings, next: (outcome) => void queue.push(outcome) };
}

describe('runCycle', () => {
  it('alerts once when a finding first appears and then stays quiet', async () => {
    const h = harness();
    h.next(scanOf(critical));
    h.next(scanOf(critical));

    await runCycle(h.deps);
    await runCycle(h.deps);

    expect(h.alerts).toHaveLength(1);
    expect(h.alerts[0]?.newFindings[0]?.workflowName).toBe('Order confirmations');
  });

  it('keeps an alert that could not be delivered and retries it on the next scan', async () => {
    const failure = { on: true };
    const h = harness({}, true, failure);
    h.next(scanOf(critical));
    h.next(scanOf(critical));

    const first = await runCycle(h.deps);
    failure.on = false;
    const second = await runCycle(h.deps);

    expect(first.delivered).toBe(false);
    expect(Object.keys(h.store.state.tracker)).toHaveLength(1);
    expect(second.delivered).toBe(true);
    expect(h.alerts).toHaveLength(1);
    expect(h.warnings[0]).toContain('will retry');
  });

  it('only alerts on what reaches the configured severity, yet still tracks the rest', async () => {
    const h = harness({ notifyMinimum: 'critical' });
    h.next(scanOf(warning));

    const outcome = await runCycle(h.deps);

    expect(h.alerts).toEqual([]);
    expect(outcome.added).toBe(0);
    expect(outcome.openFindings).toBe(1);
    expect(Object.keys(h.store.state.tracker)).toHaveLength(1);
  });

  it('announces a resolution after the finding stays away', async () => {
    const h = harness({ clearAfterScans: 2 });
    h.next(scanOf(critical));
    h.next(scanOf());
    h.next(scanOf());

    await runCycle(h.deps);
    await runCycle(h.deps);
    const third = await runCycle(h.deps);

    expect(third.resolved).toBe(1);
    expect(h.alerts).toHaveLength(2);
    expect(h.alerts[1]?.resolvedFindings).toHaveLength(1);
  });

  it('records changes without a webhook and does not fail', async () => {
    const h = harness({}, false);
    h.next(scanOf(critical));

    const outcome = await runCycle(h.deps);

    expect(outcome.status).toBe('scanned');
    expect(outcome.delivered).toBe(true);
    expect(Object.keys(h.store.state.tracker)).toHaveLength(1);
  });
});

describe('runCycle when the scan itself fails', () => {
  it('warns after the threshold, only once, and announces the recovery', async () => {
    const h = harness({ failureThreshold: 3 });
    for (let index = 0; index < 4; index += 1) {
      h.next(new Error('ECONNREFUSED'));
    }
    h.next(scanOf());

    for (let index = 0; index < 4; index += 1) {
      await runCycle(h.deps);
    }
    expect(h.alerts.map((alert) => alert.type)).toEqual(['scan-failing']);

    await runCycle(h.deps);
    expect(h.alerts.map((alert) => alert.type)).toEqual(['scan-failing', 'scan-recovered']);
    expect(h.store.state.degraded).toBe(false);
    expect(h.store.state.consecutiveFailures).toBe(0);
  });

  it('stays silent below the threshold', async () => {
    const h = harness({ failureThreshold: 3 });
    h.next(new Error('timeout'));
    h.next(new Error('timeout'));

    await runCycle(h.deps);
    await runCycle(h.deps);

    expect(h.alerts).toEqual([]);
    expect(h.store.state.consecutiveFailures).toBe(2);
  });

  it('retries the failure alert if the webhook was also down', async () => {
    const failure = { on: true };
    const h = harness({ failureThreshold: 1 }, true, failure);
    h.next(new Error('ECONNREFUSED'));
    h.next(new Error('ECONNREFUSED'));

    await runCycle(h.deps);
    failure.on = false;
    await runCycle(h.deps);

    expect(h.alerts.map((alert) => alert.type)).toEqual(['scan-failing']);
  });

  it('reports a failed scan without leaking details beyond the error message', async () => {
    const h = harness();
    h.next(new Error('n8n API returned 401 for /api/v1/workflows.'));

    const outcome = await runCycle(h.deps);

    expect(outcome.status).toBe('scan-failed');
    expect(h.warnings[0]).toContain('401');
  });
});

describe('watch', () => {
  it('scans repeatedly until it is told to stop', async () => {
    const h = harness();
    for (let index = 0; index < 3; index += 1) {
      h.next(scanOf());
    }
    const controller = new AbortController();
    let waits = 0;

    await watch(h.deps, 1000, controller.signal, async () => {
      waits += 1;
      if (waits === 3) {
        controller.abort();
      }
    });

    expect(waits).toBe(3);
  });
});
