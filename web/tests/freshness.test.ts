import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
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
    expect(formatAge(59_000, en)).toBe('just now');
  });

  it('uses whole minutes, hours and days', () => {
    expect(formatAge(3 * MINUTE + 40_000, en)).toBe('3 min ago');
    expect(formatAge(2 * 60 * MINUTE + 5 * MINUTE, en)).toBe('2 h ago');
    expect(formatAge(3 * 24 * 60 * MINUTE, en)).toBe('3 days ago');
  });

  it('says it in Spanish with the right plural', () => {
    expect(formatAge(59_000, es)).toBe('ahora mismo');
    expect(formatAge(3 * MINUTE, es)).toBe('hace 3 min');
    expect(formatAge(24 * 60 * MINUTE, es)).toBe('hace 1 día');
    expect(formatAge(3 * 24 * 60 * MINUTE, es)).toBe('hace 3 días');
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
      host: 'n8n.test',
    });
    expect(snapshot.result).toEqual(sampleResult);
    expect(snapshot.host).toBe('n8n.test');
  });

  it('reads a snapshot with no result yet', () => {
    const snapshot = parseLiveSnapshot({
      result: null,
      error: 'scanRefused',
      refreshing: true,
      intervalMinutes: 5,
      host: 'n8n.test',
    });
    expect(snapshot).toMatchObject({ result: null, refreshing: true, error: 'scanRefused' });
  });

  it('never lets text from the server through as an error', () => {
    const snapshot = parseLiveSnapshot({
      result: null,
      error: 'The scan could not finish: unreachable',
      refreshing: false,
      intervalMinutes: 5,
      host: null,
    });
    expect(snapshot.error).toBe('scanFailed');
  });

  it('rejects a snapshot missing a field', () => {
    expect(() => parseLiveSnapshot({ result: null, error: null, refreshing: false, host: null })).toThrow(
      'intervalMinutes',
    );
  });

  it('rejects a result that breaks the contract', () => {
    expect(() =>
      parseLiveSnapshot({ result: { version: 2 }, error: null, refreshing: false, intervalMinutes: 5, host: null }),
    ).toThrow('version');
  });
});
