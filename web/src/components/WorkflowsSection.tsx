'use client';

import type { ScanResult, WorkflowSummary } from 'greenlight';
import { useState } from 'react';
import { formatBeforeScan, formatUtc, pluralise } from '@/lib/format';
import { healthLabel, healthMeaning, healthStates, triggerLabel, triggerMeaning } from '@/lib/status';
import {
  countByHealth,
  filterByHealth,
  findingAnchor,
  findingsByWorkflow,
  type HealthFilter,
} from '@/lib/workflows';
import { StatusLabel } from './StatusIcon';
import styles from './WorkflowsSection.module.css';

interface WorkflowRowProps {
  workflow: WorkflowSummary;
  scannedAt: string;
  findings: { count: number; firstIndex: number } | undefined;
}

function LastRun({ iso, scannedAt }: { iso: string | null; scannedAt: string }) {
  if (iso === null) {
    return <span className={styles.muted}>No runs on record</span>;
  }
  return (
    <time dateTime={iso} title={formatUtc(iso)}>
      {formatBeforeScan(iso, scannedAt)}
      <span className="visually-hidden">, {formatUtc(iso)}</span>
    </time>
  );
}

function WorkflowRow({ workflow, scannedAt, findings }: WorkflowRowProps) {
  return (
    <tr>
      <th scope="row" data-label="Workflow">
        {workflow.name}
      </th>
      <td data-label="Status" title={healthMeaning[workflow.health]}>
        <StatusLabel state={workflow.health} label={healthLabel[workflow.health]} />
        {findings !== undefined && (
          <a className={styles.findingLink} href={`#${findingAnchor(findings.firstIndex)}`}>
            {pluralise(findings.count, 'finding')}
          </a>
        )}
      </td>
      <td data-label="Trigger" title={triggerMeaning[workflow.trigger]}>
        {triggerLabel[workflow.trigger]}
      </td>
      <td data-label="Last run">
        <LastRun iso={workflow.lastStartedAt} scannedAt={scannedAt} />
      </td>
      <td data-label="Runs read" className={styles.numeric}>
        {workflow.executionsRead}
      </td>
      <td data-label="Active">{workflow.active ? 'Active' : 'Inactive'}</td>
    </tr>
  );
}

export function WorkflowsSection({ result }: { result: ScanResult }) {
  const [selected, setSelected] = useState<HealthFilter>('all');
  const counts = countByHealth(result.workflows);
  const filter = selected !== 'all' && counts[selected] === 0 ? 'all' : selected;
  const visible = filterByHealth(result.workflows, filter);
  const findings = findingsByWorkflow(result.findings);

  return (
    <section aria-labelledby="workflows-heading" className={styles.section}>
      <div className={styles.top}>
        <h2 id="workflows-heading" className={styles.heading}>
          Workflows <span className={styles.total}>{result.workflows.length}</span>
        </h2>
        <div className={styles.filters} role="group" aria-label="Filter by status">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setSelected('all')}>
            All <span>{result.workflows.length}</span>
          </button>
          {healthStates
            .filter((state) => counts[state] > 0)
            .map((state) => (
              <button
                key={state}
                type="button"
                aria-pressed={filter === state}
                data-state={state}
                onClick={() => setSelected(state)}
              >
                {healthLabel[state]} <span>{counts[state]}</span>
              </button>
            ))}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="visually-hidden">
            Workflows checked in this scan. Last run is measured against the scan time.
          </caption>
          <thead>
            <tr>
              <th scope="col">Workflow</th>
              <th scope="col">Status</th>
              <th scope="col">Trigger</th>
              <th scope="col">Last run</th>
              <th scope="col" className={styles.numeric}>
                Runs read
              </th>
              <th scope="col">Active</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((workflow) => (
              <WorkflowRow
                key={workflow.id}
                workflow={workflow}
                scannedAt={result.scannedAt}
                findings={findings.get(workflow.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
