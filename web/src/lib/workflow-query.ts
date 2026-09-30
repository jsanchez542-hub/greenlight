import type { WorkflowSummary } from 'greenlight';
import { healthStates } from './status';
import { filterByHealth, type HealthFilter } from './workflows';

export const sortKeys = ['status', 'name', 'trigger', 'lastRun', 'runs', 'active'] as const;
export type SortKey = (typeof sortKeys)[number];
export type SortDirection = 'asc' | 'desc';

export interface WorkflowQuery {
  state: HealthFilter;
  search: string;
  sort: SortKey;
  direction: SortDirection;
}

export const defaultWorkflowQuery: WorkflowQuery = {
  state: 'all',
  search: '',
  sort: 'status',
  direction: 'asc',
};

type Comparison = (a: WorkflowSummary, b: WorkflowSummary) => number;

const comparisons: Record<SortKey, Comparison> = {
  status: (a, b) => healthStates.indexOf(a.health) - healthStates.indexOf(b.health),
  name: (a, b) => a.name.localeCompare(b.name),
  trigger: (a, b) => a.trigger.localeCompare(b.trigger),
  lastRun: (a, b) => Date.parse(a.lastStartedAt ?? '') - Date.parse(b.lastStartedAt ?? ''),
  runs: (a, b) => a.executionsRead - b.executionsRead,
  active: (a, b) => Number(b.active) - Number(a.active),
};

export function sortWorkflows(
  workflows: readonly WorkflowSummary[],
  sort: SortKey,
  direction: SortDirection,
): WorkflowSummary[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...workflows].sort((a, b) => {
    const withoutHistory = Number(a.lastStartedAt === null) - Number(b.lastStartedAt === null);
    if (sort === 'lastRun' && withoutHistory !== 0) {
      return withoutHistory;
    }
    return sign * comparisons[sort](a, b) || comparisons.status(a, b) || comparisons.name(a, b);
  });
}

export function searchWorkflows(
  workflows: readonly WorkflowSummary[],
  search: string,
): WorkflowSummary[] {
  const needle = search.trim().toLowerCase();
  return needle === ''
    ? [...workflows]
    : workflows.filter((workflow) => workflow.name.toLowerCase().includes(needle));
}

export function queryWorkflows(
  workflows: readonly WorkflowSummary[],
  query: WorkflowQuery,
): WorkflowSummary[] {
  return sortWorkflows(
    searchWorkflows(filterByHealth(workflows, query.state), query.search),
    query.sort,
    query.direction,
  );
}

export function toggleSort(query: WorkflowQuery, key: SortKey): WorkflowQuery {
  if (query.sort === key) {
    return { ...query, direction: query.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { ...query, sort: key, direction: 'asc' };
}

type ParamSource = { get(name: string): string | null };

export function parseWorkflowQuery(params: ParamSource): WorkflowQuery {
  const state = params.get('state');
  const sort = params.get('sort');
  return {
    state: healthStates.find((candidate) => candidate === state) ?? 'all',
    search: params.get('q') ?? '',
    sort: sortKeys.find((candidate) => candidate === sort) ?? defaultWorkflowQuery.sort,
    direction: params.get('dir') === 'desc' ? 'desc' : 'asc',
  };
}

export function workflowQueryToParams(query: WorkflowQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.state !== 'all') {
    params.set('state', query.state);
  }
  if (query.search.trim() !== '') {
    params.set('q', query.search);
  }
  if (query.sort !== defaultWorkflowQuery.sort) {
    params.set('sort', query.sort);
  }
  if (query.direction !== defaultWorkflowQuery.direction) {
    params.set('dir', query.direction);
  }
  return params;
}
