import type { WorkflowHealth, WorkflowSummary } from 'greenlight';
import { describe, expect, it } from 'vitest';
import {
  defaultWorkflowQuery,
  parseWorkflowQuery,
  queryWorkflows,
  searchWorkflows,
  sortWorkflows,
  toggleSort,
  workflowQueryToParams,
} from '@/lib/workflow-query';

function workflow(
  name: string,
  health: WorkflowHealth,
  overrides: Partial<WorkflowSummary> = {},
): WorkflowSummary {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    active: true,
    trigger: 'schedule',
    executionsRead: 10,
    lastStartedAt: '2026-03-02T09:00:00.000Z',
    health,
    ...overrides,
  };
}

const workflows = [
  workflow('Payments', 'healthy', { executionsRead: 110, trigger: 'event' }),
  workflow('Backup', 'critical', { executionsRead: 100, lastStartedAt: '2026-03-01T00:00:00.000Z' }),
  workflow('Audit', 'no-runs', { executionsRead: 0, lastStartedAt: null, active: false }),
  workflow('Inventory', 'warning', { executionsRead: 166 }),
  workflow('CRM sync', 'healthy', { executionsRead: 150, lastStartedAt: '2026-03-02T07:00:00.000Z' }),
];

const names = (list: WorkflowSummary[]) => list.map((entry) => entry.name);

describe('sortWorkflows', () => {
  it('orders by status severity and then by name', () => {
    expect(names(sortWorkflows(workflows, 'status', 'asc'))).toEqual([
      'Backup',
      'Inventory',
      'CRM sync',
      'Payments',
      'Audit',
    ]);
  });

  it('reverses the status order but keeps names ascending inside a status', () => {
    expect(names(sortWorkflows(workflows, 'status', 'desc'))).toEqual([
      'Audit',
      'CRM sync',
      'Payments',
      'Inventory',
      'Backup',
    ]);
  });

  it('sorts by name in both directions', () => {
    expect(names(sortWorkflows(workflows, 'name', 'asc'))[0]).toBe('Audit');
    expect(names(sortWorkflows(workflows, 'name', 'desc'))[0]).toBe('Payments');
  });

  it('sorts by runs read as numbers', () => {
    expect(names(sortWorkflows(workflows, 'runs', 'desc'))).toEqual([
      'Inventory',
      'CRM sync',
      'Payments',
      'Backup',
      'Audit',
    ]);
  });

  it('keeps workflows without history last for either direction of last run', () => {
    expect(names(sortWorkflows(workflows, 'lastRun', 'asc')).at(-1)).toBe('Audit');
    expect(names(sortWorkflows(workflows, 'lastRun', 'desc')).at(-1)).toBe('Audit');
  });

  it('puts the oldest run first when ascending on last run', () => {
    expect(names(sortWorkflows(workflows, 'lastRun', 'asc'))[0]).toBe('Backup');
  });

  it('lists active workflows first', () => {
    expect(names(sortWorkflows(workflows, 'active', 'asc')).at(-1)).toBe('Audit');
  });

  it('does not change the input', () => {
    const before = names(workflows);
    sortWorkflows(workflows, 'name', 'desc');
    expect(names(workflows)).toEqual(before);
  });
});

describe('searchWorkflows', () => {
  it('matches part of a name without regard to case', () => {
    expect(names(searchWorkflows(workflows, 'sYnC'))).toEqual(['CRM sync']);
  });

  it('ignores surrounding spaces and returns everything for an empty search', () => {
    expect(searchWorkflows(workflows, '   ')).toHaveLength(workflows.length);
    expect(names(searchWorkflows(workflows, ' audit '))).toEqual(['Audit']);
  });

  it('returns nothing when no name matches', () => {
    expect(searchWorkflows(workflows, 'zzz')).toEqual([]);
  });
});

describe('queryWorkflows', () => {
  it('applies the state filter, the search and the sort together', () => {
    const result = queryWorkflows(workflows, {
      state: 'healthy',
      search: 'c',
      sort: 'name',
      direction: 'desc',
    });
    expect(names(result)).toEqual(['CRM sync']);
  });

  it('returns the backend order for the default query', () => {
    expect(names(queryWorkflows(workflows, defaultWorkflowQuery))[0]).toBe('Backup');
  });
});

describe('toggleSort', () => {
  it('flips the direction when the same column is chosen again', () => {
    expect(toggleSort(defaultWorkflowQuery, 'status').direction).toBe('desc');
  });

  it('starts ascending on a new column', () => {
    const flipped = toggleSort(defaultWorkflowQuery, 'status');
    expect(toggleSort(flipped, 'name')).toMatchObject({ sort: 'name', direction: 'asc' });
  });
});

describe('the workflow query in the address', () => {
  it('reads every field', () => {
    const params = new URLSearchParams('state=warning&q=inv&sort=runs&dir=desc');
    expect(parseWorkflowQuery(params)).toEqual({
      state: 'warning',
      search: 'inv',
      sort: 'runs',
      direction: 'desc',
    });
  });

  it('falls back to the defaults for values it does not know', () => {
    const params = new URLSearchParams('state=fine&sort=size&dir=sideways');
    expect(parseWorkflowQuery(params)).toEqual(defaultWorkflowQuery);
  });

  it('writes nothing for the default query', () => {
    expect(workflowQueryToParams(defaultWorkflowQuery).toString()).toBe('');
  });

  it('round trips a custom query', () => {
    const query = { state: 'no-runs', search: 'a b', sort: 'lastRun', direction: 'desc' } as const;
    expect(parseWorkflowQuery(workflowQueryToParams(query))).toEqual(query);
  });
});
