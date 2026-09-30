import { describe, expect, it } from 'vitest';
import { demoResult } from '@/lib/demo';
import { InvalidScanResultError, parseScanResult } from '@/lib/scan-result';

function valid(): Record<string, unknown> {
  return structuredClone(demoResult) as unknown as Record<string, unknown>;
}

describe('the demo data', () => {
  it('parses and keeps the counts the contract promises', () => {
    expect(demoResult.workflowsScanned).toBe(demoResult.workflows.length);
    expect(demoResult.findings.length).toBeGreaterThan(0);
  });

  it('links every finding to a workflow in the list', () => {
    const ids = new Set(demoResult.workflows.map((workflow) => workflow.id));
    expect(demoResult.findings.every((finding) => ids.has(finding.workflowId))).toBe(true);
  });
});

describe('parseScanResult', () => {
  it('accepts a well formed result unchanged', () => {
    expect(parseScanResult(valid())).toEqual(demoResult);
  });

  it('rejects a version it does not know', () => {
    expect(() => parseScanResult({ ...valid(), version: 2 })).toThrow(InvalidScanResultError);
  });

  it('rejects a health state outside the contract', () => {
    const result = valid();
    (result['workflows'] as Record<string, unknown>[])[0]!['health'] = 'fine';
    expect(() => parseScanResult(result)).toThrow('workflows[0].health');
  });

  it('rejects evidence values that are neither text nor numbers', () => {
    const result = valid();
    (result['findings'] as Record<string, unknown>[])[0]!['evidence'] = { node: { nested: true } };
    expect(() => parseScanResult(result)).toThrow('findings[0].evidence.node');
  });

  it('accepts a workflow with no history', () => {
    const result = valid();
    const first = (result['workflows'] as Record<string, unknown>[])[0]!;
    first['lastStartedAt'] = null;
    expect(parseScanResult(result).workflows[0]?.lastStartedAt).toBeNull();
  });

  it('rejects input that is not an object', () => {
    expect(() => parseScanResult(null)).toThrow(InvalidScanResultError);
    expect(() => parseScanResult([])).toThrow(InvalidScanResultError);
  });

  it('rejects a timestamp that is not a date', () => {
    expect(() => parseScanResult({ ...valid(), scannedAt: 'yesterday' })).toThrow('scannedAt');
  });
});
