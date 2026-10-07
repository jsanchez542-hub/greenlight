'use client';

import type { WorkflowSummary } from 'greenlight';
import Link from 'next/link';
import { useLang, useMessages } from '@/i18n/context';
import { formatBeforeScan, formatNumber, formatUtc } from '@/lib/format';
import { workflowHref } from '@/lib/routes';
import type { SortDirection, SortKey } from '@/lib/workflow-query';
import { Icon } from '../ui/Icon';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './WorkflowTable.module.css';

interface Column {
  key: SortKey;
  numeric?: boolean;
}

const columns: readonly Column[] = [
  { key: 'name' },
  { key: 'status' },
  { key: 'trigger' },
  { key: 'lastRun' },
  { key: 'runs', numeric: true },
  { key: 'active' },
];

interface WorkflowTableProps {
  workflows: readonly WorkflowSummary[];
  scannedAt: string;
  findingCounts: ReadonlyMap<string, number>;
  sort: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}

function ariaSort(active: boolean, direction: SortDirection) {
  if (!active) {
    return undefined;
  }
  return direction === 'asc' ? 'ascending' : 'descending';
}

export function WorkflowTable({
  workflows,
  scannedAt,
  findingCounts,
  sort,
  direction,
  onSort,
}: WorkflowTableProps) {
  const t = useMessages();
  const lang = useLang();
  const names = t.workflows.columns;

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">{t.workflows.caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort(active, direction)}
                  className={column.numeric ? styles.numeric : undefined}
                >
                  <button type="button" className={styles.sort} onClick={() => onSort(column.key)}>
                    {names[column.key]}
                    <span className={styles.arrow} data-direction={active ? direction : undefined}>
                      <Icon name="chevron" />
                    </span>
                  </button>
                </th>
              );
            })}
            <th scope="col" className={styles.numeric}>
              {names.findings}
            </th>
          </tr>
        </thead>
        <tbody>
          {workflows.map((workflow) => (
            <tr key={workflow.id}>
              <th scope="row" data-label={names.name}>
                <Link href={workflowHref(workflow.id)} className={styles.rowLink}>
                  {workflow.name}
                </Link>
              </th>
              <td data-label={names.status} title={t.status.health[workflow.health].meaning}>
                <StatusLabel state={workflow.health} label={t.status.health[workflow.health].label} />
              </td>
              <td data-label={names.trigger} title={t.status.trigger[workflow.trigger].meaning}>
                {t.status.trigger[workflow.trigger].label}
              </td>
              <td data-label={names.lastRun}>
                {workflow.lastStartedAt === null ? (
                  <span className={styles.muted}>{t.status.noRuns}</span>
                ) : (
                  <time dateTime={workflow.lastStartedAt} title={formatUtc(workflow.lastStartedAt, lang)}>
                    {formatBeforeScan(workflow.lastStartedAt, scannedAt, t)}
                    <span className="visually-hidden">, {formatUtc(workflow.lastStartedAt, lang)}</span>
                  </time>
                )}
              </td>
              <td data-label={names.runs} className={styles.numeric}>
                {formatNumber(workflow.executionsRead, lang)}
              </td>
              <td data-label={names.active}>{workflow.active ? t.status.yes : t.status.no}</td>
              <td
                data-label={names.findings}
                data-empty={(findingCounts.get(workflow.id) ?? 0) === 0}
                className={styles.numeric}
              >
                {findingCounts.get(workflow.id) ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
