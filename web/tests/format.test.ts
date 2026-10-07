import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { formatBeforeScan, formatElapsed, formatNumber, formatUtc } from '@/lib/format';

const scannedAt = '2026-03-02T09:00:00.000Z';

describe('formatUtc', () => {
  it('writes the date in UTC regardless of the machine time zone', () => {
    expect(formatUtc('2026-03-02T09:00:00.000Z', 'en')).toBe('2 Mar 2026, 09:00 UTC');
  });

  it('writes it in Spanish for a Spanish reader', () => {
    expect(formatUtc('2026-03-02T09:00:00.000Z', 'es')).toBe('2 mar 2026, 09:00 UTC');
  });

  it('uses a 24 hour clock', () => {
    expect(formatUtc('2026-03-02T21:05:00.000Z', 'en')).toBe('2 Mar 2026, 21:05 UTC');
  });
});

describe('formatNumber', () => {
  it('groups digits the way each language does', () => {
    expect(formatNumber(12345.5, 'en')).toBe('12,345.5');
    expect(formatNumber(12345.5, 'es')).toBe('12.345,5');
  });
});

describe('formatBeforeScan', () => {
  it('reports a run at the scan instant as happening at scan time', () => {
    expect(formatBeforeScan(scannedAt, scannedAt, en)).toBe('At scan time');
  });

  it('treats a run that starts after the scan as at scan time', () => {
    expect(formatBeforeScan('2026-03-02T09:30:00.000Z', scannedAt, en)).toBe('At scan time');
  });

  it('uses minutes below two hours', () => {
    expect(formatBeforeScan('2026-03-02T08:15:00.000Z', scannedAt, en)).toBe('45 min before scan');
    expect(formatBeforeScan('2026-03-02T07:30:00.000Z', scannedAt, en)).toBe('90 min before scan');
  });

  it('uses hours below two days', () => {
    expect(formatBeforeScan('2026-03-02T00:00:00.000Z', scannedAt, en)).toBe('9 h before scan');
  });

  it('uses days from two days on', () => {
    expect(formatBeforeScan('2026-02-20T09:00:00.000Z', scannedAt, en)).toBe('10 days before scan');
  });

  it('says the same in Spanish', () => {
    expect(formatBeforeScan('2026-03-02T08:15:00.000Z', scannedAt, es)).toBe('45 min antes del análisis');
    expect(formatBeforeScan('2026-02-20T09:00:00.000Z', scannedAt, es)).toBe('10 días antes del análisis');
    expect(formatBeforeScan(scannedAt, scannedAt, es)).toBe('En el momento del análisis');
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
