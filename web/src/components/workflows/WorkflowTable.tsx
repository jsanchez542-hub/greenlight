import type { WorkflowSummary } from 'greenlight';
import Link from 'next/link';
import { formatBeforeScan, formatUtc } from '@/lib/format';
import { workflowHref } from '@/lib/routes';
import { healthLabel, healthMeaning, triggerLabel, triggerMeaning } from '@/lib/status';
import type { SortDirection, SortKey } from '@/lib/workflow-query';
import { Icon } from '../ui/Icon';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './WorkflowTable.module.css';

interface Column {
  key: SortKey;
  label: string;
  numeric?: boolean;
}

const columns: readonly Column[] = [
  { key: 'name', label: 'Workflow' },
  { key: 'status', label: 'Status' },
  { key: 'trigger', label: 'Trigger' },
  { key: 'lastRun', label: 'Last run' },
  { key: 'runs', label: 'Runs read', numeric: true },
  { key: 'active', label: 'Active' },
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
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">
          Workflows checked in this scan. Last run is measured against the scan time. Column
          headers sort the table.
        </caption>
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
                    {column.label}
                    <span className={styles.arrow} data-direction={active ? direction : undefined}>
                      <Icon name="chevron" />
                    </span>
                  </button>
                </th>
              );
            })}
            <th scope="col" className={styles.numeric}>
              Findings
            </th>
          </tr>
        </thead>
        <tbody>
          {workflows.map((workflow) => (
            <tr key={workflow.id}>
              <th scope="row" data-label="Workflow">
                <Link href={workflowHref(workflow.id)} className={styles.rowLink}>
                  {workflow.name}
                </Link>
              </th>
              <td data-label="Status" title={healthMeaning[workflow.health]}>
                <StatusLabel state={workflow.health} label={healthLabel[workflow.health]} />
              </td>
              <td data-label="Trigger" title={triggerMeaning[workflow.trigger]}>
                {triggerLabel[workflow.trigger]}
              </td>
              <td data-label="Last run">
                {workflow.lastStartedAt === null ? (
                  <span className={styles.muted}>no runs on record</span>
                ) : (
                  <time dateTime={workflow.lastStartedAt} title={formatUtc(workflow.lastStartedAt)}>
                    {formatBeforeScan(workflow.lastStartedAt, scannedAt)}
                    <span className="visually-hidden">, {formatUtc(workflow.lastStartedAt)}</span>
                  </time>
                )}
              </td>
              <td data-label="Runs read" className={styles.numeric}>
                {workflow.executionsRead}
              </td>
              <td data-label="Active">{workflow.active ? 'yes' : 'no'}</td>
              <td
                data-label="Findings"
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
