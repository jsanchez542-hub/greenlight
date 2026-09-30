'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { pluralise } from '@/lib/format';
import { useResult } from '@/lib/scan-context';
import { SEARCH_INPUT_ID } from '@/lib/shortcuts';
import { healthLabel, healthStates } from '@/lib/status';
import { useReplaceParams } from '@/lib/use-replace-params';
import {
  defaultWorkflowQuery,
  parseWorkflowQuery,
  queryWorkflows,
  toggleSort,
  workflowQueryToParams,
  type SortKey,
  type WorkflowQuery,
} from '@/lib/workflow-query';
import { countByHealth, countFindingsByWorkflow, type HealthFilter } from '@/lib/workflows';
import { FilterGroup, type FilterOption } from '../ui/FilterGroup';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import styles from './WorkflowsView.module.css';
import { WorkflowTable } from './WorkflowTable';

export function WorkflowsView() {
  const result = useResult();
  const replaceParams = useReplaceParams();
  const fromAddress = parseWorkflowQuery(useSearchParams());
  const [search, setSearch] = useState(fromAddress.search);
  const query: WorkflowQuery = { ...fromAddress, search };

  const counts = countByHealth(result.workflows);
  const visible = queryWorkflows(result.workflows, query);
  const options: FilterOption[] = [
    { value: 'all', label: 'all', count: result.workflows.length },
    ...healthStates.map((state) => ({
      value: state,
      label: healthLabel[state].toLowerCase(),
      count: counts[state],
      state,
    })),
  ];

  function update(next: Partial<WorkflowQuery>) {
    replaceParams(workflowQueryToParams({ ...query, ...next }));
  }

  if (result.workflows.length === 0) {
    return (
      <>
        <PageHeader title="workflows" meta="no workflows found" />
        <section className={styles.empty}>
          <p>The instance has no workflows yet. Create one in n8n and scan again.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="workflows"
        meta={`${visible.length} of ${pluralise(result.workflows.length, 'workflow')} shown`}
      />

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className="visually-hidden">Filter workflows by name</span>
          <Icon name="search" />
          <input
            id={SEARCH_INPUT_ID}
            type="search"
            value={search}
            placeholder="filter by name"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setSearch(event.target.value);
              update({ search: event.target.value });
            }}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <FilterGroup
          label="status"
          options={options}
          value={query.state}
          onChange={(state) => update({ state: state as HealthFilter })}
        />
      </div>

      {visible.length === 0 ? (
        <section className={styles.empty}>
          <p>No workflow matches the current search and filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              replaceParams(workflowQueryToParams({ ...defaultWorkflowQuery, ...pickSort(query) }));
            }}
          >
            Clear search and filter
          </button>
        </section>
      ) : (
        <WorkflowTable
          workflows={visible}
          scannedAt={result.scannedAt}
          findingCounts={countFindingsByWorkflow(result.findings)}
          sort={query.sort}
          direction={query.direction}
          onSort={(key: SortKey) => update(toggleSort(query, key))}
        />
      )}
    </>
  );
}

function pickSort({ sort, direction }: WorkflowQuery): Pick<WorkflowQuery, 'sort' | 'direction'> {
  return { sort, direction };
}
