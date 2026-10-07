import type { DetectorName, Finding, Severity } from 'greenlight';
import { describe, expect, it } from 'vitest';
import { sampleResult } from '@/lib/sample';
import { detectorSeverity } from '@/lib/detectors';
import {
  countFindings,
  filterFindings,
  findingFilterToParams,
  keyFindings,
  noFindingFilter,
  parseFindingFilter,
} from '@/lib/findings';

function finding(workflowId: string, detector: DetectorName, severity: Severity): Finding {
  return { workflowId, workflowName: workflowId, detector, severity, summary: 'summary', evidence: {} };
}

const findings = [
  finding('orders', 'silent-error', 'critical'),
  finding('orders', 'silent-error', 'critical'),
  finding('warehouse', 'silence', 'critical'),
  finding('inventory', 'duration-drift', 'warning'),
];

describe('keyFindings', () => {
  it('gives every finding a distinct key', () => {
    const keys = keyFindings(findings).map((entry) => entry.key);
    expect(new Set(keys).size).toBe(findings.length);
  });

  it('numbers repeated findings of one workflow and check in order', () => {
    expect(keyFindings(findings).map((entry) => entry.key).slice(0, 2)).toEqual([
      'orders:silent-error:0',
      'orders:silent-error:1',
    ]);
  });

  it('keeps a key stable when other workflows change', () => {
    const before = keyFindings(findings).find((entry) => entry.finding.workflowId === 'warehouse');
    const after = keyFindings(findings.slice(1)).find(
      (entry) => entry.finding.workflowId === 'warehouse',
    );
    expect(after?.key).toBe(before?.key);
  });
});

describe('filterFindings', () => {
  const entries = keyFindings(findings);

  it('keeps everything without a filter', () => {
    expect(filterFindings(entries, noFindingFilter)).toHaveLength(4);
  });

  it('filters by severity', () => {
    expect(filterFindings(entries, { severity: 'warning', check: 'all' })).toHaveLength(1);
  });

  it('filters by check', () => {
    expect(filterFindings(entries, { severity: 'all', check: 'silent-error' })).toHaveLength(2);
  });

  it('requires both conditions when both are set', () => {
    expect(filterFindings(entries, { severity: 'warning', check: 'silence' })).toEqual([]);
  });
});

describe('countFindings', () => {
  it('counts per severity and per check, including checks with no findings', () => {
    expect(countFindings(keyFindings(findings))).toEqual({
      bySeverity: { critical: 3, warning: 1 },
      byCheck: { 'silent-error': 2, 'duration-drift': 1, silence: 1, 'frequency-drop': 0 },
    });
  });
});

describe('the finding filter in the address', () => {
  it('reads both fields', () => {
    const filter = parseFindingFilter(new URLSearchParams('severity=critical&check=silence'));
    expect(filter).toEqual({ severity: 'critical', check: 'silence' });
  });

  it('ignores values it does not know', () => {
    const filter = parseFindingFilter(new URLSearchParams('severity=fatal&check=other'));
    expect(filter).toEqual(noFindingFilter);
  });

  it('writes only what differs from the default', () => {
    expect(findingFilterToParams(noFindingFilter).toString()).toBe('');
    expect(findingFilterToParams({ severity: 'warning', check: 'all' }).toString()).toBe(
      'severity=warning',
    );
  });
});

describe('the check descriptions', () => {
  it('agree with the severity the scanner gives each check in the sample data', () => {
    for (const { detector, severity } of sampleResult.findings) {
      expect(detectorSeverity[detector]).toBe(severity);
    }
  });
});
