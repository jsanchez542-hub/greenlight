import { describe, expect, it } from 'vitest';
import { ageMs, formatAge, isStale } from '@/lib/freshness';
import { parseLiveSnapshot } from '@/lib/live-snapshot';
import { sampleResult } from '@/lib/sample';

const MINUTE = 60_000;

describe('ageMs', () => {
  it('measures the time since the scan', () => {
    expect(ageMs('2026-03-02T09:00:00.000Z', Date.parse('2026-03-02T09:03:00.000Z'))).toBe(3 * MINUTE);
  });

  it('never goes negative when the clocks disagree', () => {
    expect(ageMs('2026-03-02T09:00:00.000Z', Date.parse('2026-03-02T08:59:00.000Z'))).toBe(0);
  });
});

describe('formatAge', () => {
  it('says just now under a minute', () => {
    expect(formatAge(59_000)).toBe('just now');
  });

  it('uses whole minutes, hours and days', () => {
    expect(formatAge(3 * MINUTE + 40_000)).toBe('3 min ago');
    expect(formatAge(2 * 60 * MINUTE + 5 * MINUTE)).toBe('2 h ago');
    expect(formatAge(3 * 24 * 60 * MINUTE)).toBe('3 days ago');
  });
});

describe('isStale', () => {
  it('is fresh up to three intervals', () => {
    expect(isStale(15 * MINUTE, 5)).toBe(false);
  });

  it('is stale beyond three intervals', () => {
    expect(isStale(15 * MINUTE + 1, 5)).toBe(true);
  });

  it('scales with the interval', () => {
    expect(isStale(20 * MINUTE, 10)).toBe(false);
    expect(isStale(31 * MINUTE, 10)).toBe(true);
  });
});

describe('parseLiveSnapshot', () => {
  it('reads a snapshot that holds a result', () => {
    const snapshot = parseLiveSnapshot({
      result: sampleResult,
      error: null,
      refreshing: false,
      intervalMinutes: 5,
    });
    expect(snapshot.result).toEqual(sampleResult);
  });

  it('reads a snapshot with no result yet', () => {
    const snapshot = parseLiveSnapshot({
      result: null,
      error: 'The scan could not finish: unreachable',
      refreshing: true,
      intervalMinutes: 5,
    });
    expect(snapshot).toMatchObject({ result: null, refreshing: true });
  });

  it('rejects a snapshot missing a field', () => {
    expect(() => parseLiveSnapshot({ result: null, error: null, refreshing: false })).toThrow(
      'intervalMinutes',
    );
  });

  it('rejects a result that breaks the contract', () => {
    expect(() =>
      parseLiveSnapshot({ result: { version: 2 }, error: null, refreshing: false, intervalMinutes: 5 }),
    ).toThrow('version');
  });
});
