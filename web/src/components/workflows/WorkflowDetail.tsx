'use client';

import Link from 'next/link';
import { formatBeforeScan, formatUtc } from '@/lib/format';
import { keyFindings } from '@/lib/findings';
import { useResult } from '@/lib/scan-context';
import { healthLabel, healthMeaning, triggerLabel, triggerMeaning } from '@/lib/status';
import { FindingRow } from '../findings/FindingRow';
import { NotInScan } from '../ui/Notice';
import { PageHeader } from '../ui/PageHeader';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './WorkflowDetail.module.css';

export function WorkflowDetail({ workflowId }: { workflowId: string }) {
  const result = useResult();
  const workflow = result.workflows.find((candidate) => candidate.id === workflowId);

  if (workflow === undefined) {
    return <NotInScan what="This workflow" backHref="/workflows" backLabel="Back to workflows" />;
  }

  const findings = keyFindings(result.findings).filter(
    (entry) => entry.finding.workflowId === workflow.id,
  );

  return (
    <>
      <PageHeader
        title={workflow.name}
        meta={`id ${workflow.id}`}
        actions={
          <Link href="/workflows" className={styles.back}>
            All workflows
          </Link>
        }
      />

      <section className={styles.status} data-state={workflow.health} aria-labelledby="status-heading">
        <h2 id="status-heading" className="visually-hidden">
          Status
        </h2>
        <p className={styles.label}>
          <StatusLabel state={workflow.health} label={healthLabel[workflow.health]} />
        </p>
        <p className={styles.meaning}>{healthMeaning[workflow.health]}</p>
      </section>

      <dl className={styles.facts}>
        <div>
          <dt>trigger</dt>
          <dd>
            {triggerLabel[workflow.trigger]}
            <span>{triggerMeaning[workflow.trigger]}</span>
          </dd>
        </div>
        <div>
          <dt>active</dt>
          <dd>{workflow.active ? 'yes' : 'no'}</dd>
        </div>
        <div>
          <dt>runs read</dt>
          <dd>{workflow.executionsRead}</dd>
        </div>
        <div>
          <dt>last run</dt>
          <dd>
            {workflow.lastStartedAt === null ? (
              'no runs on record'
            ) : (
              <>
                {formatBeforeScan(workflow.lastStartedAt, result.scannedAt)}
                <span>
                  <time dateTime={workflow.lastStartedAt}>{formatUtc(workflow.lastStartedAt)}</time>
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>

      <section className={styles.findings} aria-labelledby="findings-heading">
        <h2 id="findings-heading">findings</h2>
        {findings.length === 0 ? (
          <p className={styles.none}>No check raised a finding for this workflow.</p>
        ) : (
          <ul className={styles.list}>
            {findings.map((entry) => (
              <FindingRow key={entry.key} entry={entry} showWorkflow={false} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
