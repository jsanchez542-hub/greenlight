import type { Finding, WorkflowHealth, WorkflowSummary } from 'greenlight';
import { describe, expect, it } from 'vitest';
import {
  countByHealth,
  countBySeverity,
  filterByHealth,
  countFindingsByWorkflow,
} from '@/lib/workflows';

function workflow(id: string, health: WorkflowHealth): WorkflowSummary {
  return {
    id,
    name: id,
    active: true,
    trigger: 'schedule',
    executionsRead: health === 'no-runs' ? 0 : 10,
    lastStartedAt: null,
    health,
  };
}

function finding(workflowId: string, severity: Finding['severity']): Finding {
  return {
    workflowId,
    workflowName: workflowId,
    detector: 'silence',
    severity,
    summary: 'summary',
    evidence: {},
  };
}

const workflows = [
  workflow('a', 'critical'),
  workflow('b', 'warning'),
  workflow('c', 'healthy'),
  workflow('d', 'healthy'),
  workflow('e', 'no-runs'),
];

describe('countByHealth', () => {
  it('counts every state, including the ones with no workflows', () => {
    expect(countByHealth(workflows)).toEqual({ critical: 1, warning: 1, healthy: 2, 'no-runs': 1 });
    expect(countByHealth([])).toEqual({ critical: 0, warning: 0, healthy: 0, 'no-runs': 0 });
  });
});

describe('countBySeverity', () => {
  it('counts findings per severity', () => {
    const findings = [finding('a', 'critical'), finding('b', 'warning'), finding('a', 'warning')];
    expect(countBySeverity(findings)).toEqual({ critical: 1, warning: 2 });
  });
});

describe('filterByHealth', () => {
  it('returns every workflow for the all filter', () => {
    expect(filterByHealth(workflows, 'all')).toEqual(workflows);
  });

  it('keeps only the chosen state and preserves the incoming order', () => {
    expect(filterByHealth(workflows, 'healthy').map(({ id }) => id)).toEqual(['c', 'd']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterByHealth([workflow('a', 'healthy')], 'critical')).toEqual([]);
  });

  it('does not hand back the input array itself', () => {
    expect(filterByHealth(workflows, 'all')).not.toBe(workflows);
  });
});

describe('countFindingsByWorkflow', () => {
  it('counts the findings each workflow has', () => {
    const findings = [finding('a', 'critical'), finding('b', 'warning'), finding('a', 'warning')];
    const counts = countFindingsByWorkflow(findings);

    expect(counts.get('a')).toBe(2);
    expect(counts.get('b')).toBe(1);
    expect(counts.has('c')).toBe(false);
  });
});
