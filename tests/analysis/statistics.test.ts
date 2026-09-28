import { describe, expect, it } from 'vitest';
import type { Execution } from '../../src/n8n/types.js';
import {
  durationStats,
  durationsMs,
  intervalStats,
  lastStartedAt,
  percentile,
  splitByWindow,
} from '../../src/analysis/statistics.js';

function execution(startedAt: string, durationMs: number | null): Execution {
  return {
    id: startedAt,
    workflowId: 'wf',
    status: 'success',
    startedAt,
    stoppedAt: durationMs === null ? null : new Date(Date.parse(startedAt) + durationMs).toISOString(),
  };
}

describe('percentile', () => {
  it('uses nearest rank so the result is always an observed value', () => {
    const values = [10, 20, 30, 40];

    expect(percentile(values, 0.5)).toBe(20);
    expect(percentile(values, 0.95)).toBe(40);
  });

  it('rejects an empty series instead of returning a misleading zero', () => {
    expect(() => percentile([], 0.5)).toThrow(RangeError);
  });
});

describe('durationsMs', () => {
  it('ignores executions that are still running', () => {
    const values = durationsMs([
      execution('2026-01-01T00:00:00.000Z', 1000),
      execution('2026-01-01T00:01:00.000Z', null),
    ]);

    expect(values).toEqual([1000]);
  });
});

describe('durationStats', () => {
  it('returns null when nothing measurable is left', () => {
    expect(durationStats([execution('2026-01-01T00:00:00.000Z', null)])).toBeNull();
  });

  it('summarises a finished series', () => {
    const stats = durationStats([
      execution('2026-01-01T00:00:00.000Z', 1000),
      execution('2026-01-01T00:01:00.000Z', 3000),
      execution('2026-01-01T00:02:00.000Z', 2000),
    ]);

    expect(stats).toEqual({ count: 3, medianMs: 2000, p95Ms: 3000 });
  });
});

describe('intervalStats', () => {
  it('needs three executions before claiming a cadence exists', () => {
    expect(
      intervalStats([
        execution('2026-01-01T00:00:00.000Z', 100),
        execution('2026-01-01T00:05:00.000Z', 100),
      ]),
    ).toBeNull();
  });

  it('measures the typical gap regardless of input order', () => {
    const stats = intervalStats([
      execution('2026-01-01T00:10:00.000Z', 100),
      execution('2026-01-01T00:00:00.000Z', 100),
      execution('2026-01-01T00:05:00.000Z', 100),
    ]);

    expect(stats?.medianMs).toBe(5 * 60 * 1000);
  });

  it('marks an evenly spaced schedule as regular', () => {
    const stats = intervalStats([
      execution('2026-01-01T00:00:00.000Z', 100),
      execution('2026-01-01T00:05:00.000Z', 100),
      execution('2026-01-01T00:10:00.000Z', 100),
      execution('2026-01-01T00:15:00.000Z', 100),
    ]);

    expect(stats?.regular).toBe(true);
  });

  it('marks sporadic webhook traffic as irregular', () => {
    const stats = intervalStats([
      execution('2026-01-01T00:00:00.000Z', 100),
      execution('2026-01-01T00:01:00.000Z', 100),
      execution('2026-01-01T00:02:00.000Z', 100),
      execution('2026-01-03T00:00:00.000Z', 100),
    ]);

    expect(stats?.regular).toBe(false);
  });
});

describe('lastStartedAt', () => {
  it('returns the newest start even when the input is unordered', () => {
    const latest = lastStartedAt([
      execution('2026-01-01T00:00:00.000Z', 100),
      execution('2026-01-03T00:00:00.000Z', 100),
      execution('2026-01-02T00:00:00.000Z', 100),
    ]);

    expect(latest?.toISOString()).toBe('2026-01-03T00:00:00.000Z');
  });

  it('returns null when there is nothing to measure', () => {
    expect(lastStartedAt([])).toBeNull();
  });
});

describe('splitByWindow', () => {
  it('separates the recent window from the baseline', () => {
    const now = new Date('2026-01-02T00:00:00.000Z');
    const { baseline, recent } = splitByWindow(
      [execution('2026-01-01T23:00:00.000Z', 100), execution('2026-01-01T00:00:00.000Z', 100)],
      now,
      2,
    );

    expect(recent).toHaveLength(1);
    expect(baseline).toHaveLength(1);
    expect(recent[0]?.startedAt).toBe('2026-01-01T23:00:00.000Z');
  });
});
