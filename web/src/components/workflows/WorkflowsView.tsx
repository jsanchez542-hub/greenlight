'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useMessages } from '@/i18n/context';
import { useResult } from '@/lib/scan-context';
import { SEARCH_INPUT_ID } from '@/lib/shortcuts';
import { healthStates } from '@/lib/status';
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
  const t = useMessages();
  const result = useResult();
  const replaceParams = useReplaceParams();
  const fromAddress = parseWorkflowQuery(useSearchParams());
  const [search, setSearch] = useState(fromAddress.search);
  const query: WorkflowQuery = { ...fromAddress, search };

  const counts = countByHealth(result.workflows);
  const visible = queryWorkflows(result.workflows, query);
  const options: FilterOption[] = [
    { value: 'all', label: t.status.all, count: result.workflows.length },
    ...healthStates.map((state) => ({
      value: state,
      label: t.status.health[state].label.toLowerCase(),
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
        <PageHeader title={t.workflows.title} meta={t.workflows.noWorkflowsMeta} />
        <section className={styles.empty}>
          <p>{t.workflows.emptyBody}</p>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t.workflows.title} meta={t.workflows.shown(visible.length, result.workflows.length)} />

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className="visually-hidden">{t.workflows.searchLabel}</span>
          <Icon name="search" />
          <input
            id={SEARCH_INPUT_ID}
            type="search"
            value={search}
            placeholder={t.workflows.searchPlaceholder}
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
          label={t.filter.status}
          options={options}
          value={query.state}
          onChange={(state) => update({ state: state as HealthFilter })}
        />
      </div>

      {visible.length === 0 ? (
        <section className={styles.empty}>
          <p>{t.workflows.noMatch}</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              replaceParams(workflowQueryToParams({ ...defaultWorkflowQuery, ...pickSort(query) }));
            }}
          >
            {t.workflows.clear}
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
