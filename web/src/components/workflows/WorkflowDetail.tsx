'use client';

import Link from 'next/link';
import { useLang, useMessages } from '@/i18n/context';
import { formatBeforeScan, formatUtc } from '@/lib/format';
import { keyFindings } from '@/lib/findings';
import { useResult } from '@/lib/scan-context';
import { FindingRow } from '../findings/FindingRow';
import { NotInScan } from '../ui/Notice';
import { PageHeader } from '../ui/PageHeader';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './WorkflowDetail.module.css';

export function WorkflowDetail({ workflowId }: { workflowId: string }) {
  const t = useMessages();
  const lang = useLang();
  const result = useResult();
  const workflow = result.workflows.find((candidate) => candidate.id === workflowId);

  if (workflow === undefined) {
    return <NotInScan kind="workflow" backHref="/workflows" />;
  }

  const findings = keyFindings(result.findings).filter(
    (entry) => entry.finding.workflowId === workflow.id,
  );

  return (
    <>
      <PageHeader
        title={workflow.name}
        meta={t.workflows.id(workflow.id)}
        actions={
          <Link href="/workflows" className={styles.back}>
            {t.workflows.all}
          </Link>
        }
      />

      <section className={styles.status} data-state={workflow.health} aria-labelledby="status-heading">
        <h2 id="status-heading" className="visually-hidden">
          {t.workflows.statusHeading}
        </h2>
        <p className={styles.label}>
          <StatusLabel state={workflow.health} label={t.status.health[workflow.health].label} />
        </p>
        <p className={styles.meaning}>{t.status.health[workflow.health].meaning}</p>
      </section>

      <dl className={styles.facts}>
        <div>
          <dt>{t.workflows.facts.trigger}</dt>
          <dd>
            {t.status.trigger[workflow.trigger].label}
            <span>{t.status.trigger[workflow.trigger].meaning}</span>
          </dd>
        </div>
        <div>
          <dt>{t.workflows.facts.active}</dt>
          <dd>{workflow.active ? t.status.yes : t.status.no}</dd>
        </div>
        <div>
          <dt>{t.workflows.facts.runs}</dt>
          <dd>{workflow.executionsRead}</dd>
        </div>
        <div>
          <dt>{t.workflows.facts.lastRun}</dt>
          <dd>
            {workflow.lastStartedAt === null ? (
              t.status.noRuns
            ) : (
              <>
                {formatBeforeScan(workflow.lastStartedAt, result.scannedAt, t)}
                <span>
                  <time dateTime={workflow.lastStartedAt}>{formatUtc(workflow.lastStartedAt, lang)}</time>
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>

      <section className={styles.findings} aria-labelledby="findings-heading">
        <h2 id="findings-heading">{t.workflows.findingsHeading}</h2>
        {findings.length === 0 ? (
          <p className={styles.none}>{t.workflows.noFindings}</p>
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
