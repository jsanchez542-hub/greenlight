import type { ScanResult } from 'greenlight';
import { describe, expect, it } from 'vitest';
import { sampleResult } from '@/lib/sample';
import { ScanCache } from '@/lib/server/scan-cache';

const MINUTE = 60_000;

function scanner(outcomes: Array<ScanResult | Error>) {
  const calls = { count: 0 };
  const scan = async () => {
    const outcome = outcomes[Math.min(calls.count, outcomes.length - 1)]!;
    calls.count += 1;
    if (outcome instanceof Error) {
      throw outcome;
    }
    return outcome;
  };
  return { scan, calls };
}

function build(outcomes: Array<ScanResult | Error>, intervalMinutes = 5) {
  const clock = { now: 1_000_000 };
  const { scan, calls } = scanner(outcomes);
  const cache = new ScanCache({
    scan,
    describeFailure: (error) => ((error as Error).message === 'unreachable' ? 'scanRefused' : 'scanFailed'),
    intervalMinutes,
    host: 'n8n.test',
    now: () => clock.now,
  });
  return { cache, clock, calls };
}

describe('ScanCache', () => {
  it('starts a scan on the first read and reports it as running', () => {
    const { cache, calls } = build([sampleResult]);
    const snapshot = cache.snapshot();

    expect(snapshot.refreshing).toBe(true);
    expect(snapshot.result).toBeNull();
    expect(calls.count).toBe(1);
  });

  it('serves the stored result without scanning again inside the interval', async () => {
    const { cache, clock, calls } = build([sampleResult]);
    cache.snapshot();
    await cache.refresh();

    clock.now += 4 * MINUTE;
    const snapshot = cache.snapshot();

    expect(snapshot.result).toEqual(sampleResult);
    expect(snapshot.refreshing).toBe(false);
    expect(calls.count).toBe(1);
  });

  it('scans again once the interval has passed', async () => {
    const { cache, clock, calls } = build([sampleResult]);
    cache.snapshot();
    await cache.refresh();

    clock.now += 5 * MINUTE;
    expect(cache.snapshot().refreshing).toBe(true);
    expect(calls.count).toBe(2);
  });

  it('shares one scan between concurrent readers', () => {
    const { cache, calls } = build([sampleResult]);
    cache.snapshot();
    cache.snapshot();
    void cache.refresh();

    expect(calls.count).toBe(1);
  });

  it('keeps the last good result and reports the error when a later scan fails', async () => {
    const { cache, clock } = build([sampleResult, new Error('unreachable')]);
    cache.snapshot();
    await cache.refresh();

    clock.now += 5 * MINUTE;
    cache.snapshot();
    await cache.refresh();
    const snapshot = cache.snapshot();

    expect(snapshot.result).toEqual(sampleResult);
    expect(snapshot.error).toBe('scanRefused');
  });

  it('clears the error after a scan succeeds again', async () => {
    const { cache, clock } = build([new Error('down'), sampleResult]);
    cache.snapshot();
    await cache.refresh();
    expect(cache.snapshot().error).toBe('scanFailed');

    clock.now += 5 * MINUTE;
    cache.snapshot();
    await cache.refresh();

    expect(cache.snapshot().error).toBeNull();
  });

  it('does not retry a failing instance before the interval', async () => {
    const { cache, clock, calls } = build([new Error('down')]);
    cache.snapshot();
    await cache.refresh();

    clock.now += MINUTE;
    cache.snapshot();

    expect(calls.count).toBe(1);
  });

  it('scans on request even inside the interval', async () => {
    const { cache, calls } = build([sampleResult]);
    cache.snapshot();
    await cache.refresh();

    void cache.refresh();
    expect(calls.count).toBe(2);
  });

  it('reports the host it was given and nothing more of the address', () => {
    const { cache } = build([sampleResult]);
    expect(cache.snapshot().host).toBe('n8n.test');
  });

  it('reports the interval it was given', () => {
    const { cache } = build([sampleResult], 12);
    expect(cache.snapshot().intervalMinutes).toBe(12);
  });
});

describe('ScanCache forced refresh', () => {
  it('starts a scan the first time it is asked', () => {
    const { cache, calls } = build([sampleResult]);

    expect(cache.forceRefresh()).toEqual({ accepted: true, retryAfterSeconds: 0 });
    expect(calls.count).toBe(1);
  });

  it('refuses to scan again during the cooldown and says how long to wait', async () => {
    const { cache, clock, calls } = build([sampleResult]);
    cache.forceRefresh();
    await cache.refresh();

    clock.now += 10_000;
    const outcome = cache.forceRefresh();

    expect(outcome).toEqual({ accepted: false, retryAfterSeconds: 20 });
    expect(calls.count).toBe(1);
  });

  it('accepts again once the cooldown has passed', async () => {
    const { cache, clock, calls } = build([sampleResult]);
    cache.forceRefresh();
    await cache.refresh();

    clock.now += 30_000;

    expect(cache.forceRefresh().accepted).toBe(true);
    expect(calls.count).toBe(2);
  });

  it('joins a scan that is already running instead of refusing or starting another', () => {
    const { cache, calls } = build([sampleResult]);
    cache.forceRefresh();

    expect(cache.forceRefresh()).toEqual({ accepted: true, retryAfterSeconds: 0 });
    expect(calls.count).toBe(1);
  });

  it('cannot be used to hammer a failing instance', async () => {
    const { cache, calls } = build([new Error('down')]);
    cache.forceRefresh();
    await cache.refresh();

    const outcomes = Array.from({ length: 20 }, () => cache.forceRefresh());

    expect(outcomes.every((outcome) => !outcome.accepted)).toBe(true);
    expect(calls.count).toBe(1);
  });
});
