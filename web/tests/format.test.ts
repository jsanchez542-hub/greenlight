import { describe, expect, it } from 'vitest';
import { formatBeforeScan, formatElapsed, formatUtc, pluralise } from '@/lib/format';

const scannedAt = '2026-03-02T09:00:00.000Z';

describe('formatUtc', () => {
  it('writes the date in UTC regardless of the machine time zone', () => {
    expect(formatUtc('2026-03-02T09:00:00.000Z')).toBe('2 Mar 2026, 09:00 UTC');
  });

  it('uses a 24 hour clock', () => {
    expect(formatUtc('2026-03-02T21:05:00.000Z')).toBe('2 Mar 2026, 21:05 UTC');
  });
});

describe('pluralise', () => {
  it('keeps the singular for exactly one', () => {
    expect(pluralise(1, 'finding')).toBe('1 finding');
  });

  it('pluralises zero and many', () => {
    expect(pluralise(0, 'finding')).toBe('0 findings');
    expect(pluralise(4, 'finding')).toBe('4 findings');
  });

  it('accepts an irregular plural', () => {
    expect(pluralise(2, 'day', 'days')).toBe('2 days');
  });
});

describe('formatBeforeScan', () => {
  it('reports a run at the scan instant as happening at scan time', () => {
    expect(formatBeforeScan(scannedAt, scannedAt)).toBe('At scan time');
  });

  it('treats a run that starts after the scan as at scan time', () => {
    expect(formatBeforeScan('2026-03-02T09:30:00.000Z', scannedAt)).toBe('At scan time');
  });

  it('uses minutes below two hours', () => {
    expect(formatBeforeScan('2026-03-02T08:15:00.000Z', scannedAt)).toBe('45 min before scan');
    expect(formatBeforeScan('2026-03-02T07:30:00.000Z', scannedAt)).toBe('90 min before scan');
  });

  it('uses hours below two days', () => {
    expect(formatBeforeScan('2026-03-02T00:00:00.000Z', scannedAt)).toBe('9 h before scan');
  });

  it('uses days from two days on', () => {
    expect(formatBeforeScan('2026-02-20T09:00:00.000Z', scannedAt)).toBe('10 days before scan');
  });
});

describe('formatElapsed', () => {
  it('shows seconds under a minute', () => {
    expect(formatElapsed(0)).toBe('0 s');
    expect(formatElapsed(59_999)).toBe('59 s');
  });

  it('shows minutes and padded seconds from one minute on', () => {
    expect(formatElapsed(65_000)).toBe('1 min 05 s');
    expect(formatElapsed(600_000)).toBe('10 min 00 s');
  });
});
