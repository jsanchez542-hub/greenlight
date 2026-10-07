import type { ScanResult } from 'greenlight';
import { parseFailureCode, type FailureCode } from './failure';
import { asBoolean, asCount, asRecord, asString, parseScanResult } from './scan-result';

export interface LiveSnapshot {
  result: ScanResult | null;
  error: FailureCode | null;
  refreshing: boolean;
  intervalMinutes: number;
  host: string | null;
}

export function parseLiveSnapshot(value: unknown): LiveSnapshot {
  const fields = asRecord(value, 'the snapshot');
  return {
    result: fields['result'] === null ? null : parseScanResult(fields['result']),
    error: fields['error'] === null ? null : (parseFailureCode(fields['error']) ?? 'scanFailed'),
    refreshing: asBoolean(fields['refreshing'], 'refreshing'),
    intervalMinutes: asCount(fields['intervalMinutes'], 'intervalMinutes'),
    host: fields['host'] === null ? null : asString(fields['host'], 'host'),
  };
}
