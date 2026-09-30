'use client';

import Link from 'next/link';
import { formatUtc, pluralise } from '@/lib/format';
import { keyFindings } from '@/lib/findings';
import { useResult } from '@/lib/scan-context';
import { healthLabel, healthMeaning, healthStates, severityLabel } from '@/lib/status';
import { countByHealth, countBySeverity } from '@/lib/workflows';
import { FindingRow } from '../findings/FindingRow';
import { PageHeader } from '../ui/PageHeader';
import { StatusIcon, StatusLabel } from '../ui/StatusIcon';
import styles from './Overview.module.css';
import { WorkflowMap } from './WorkflowMap';

const ATTENTION_LIMIT = 6;

export function Overview() {
  const result = useResult();
  const counts = countByHealth(result.workflows);
  const bySeverity = countBySeverity(result.findings);
  const entries = keyFindings(result.findings);
  const withHistory = result.workflows.length - counts['no-runs'];

  return (
    <>
      <PageHeader
        title="overview"
        meta={
          <>
            scanned <time dateTime={result.scannedAt}>{formatUtc(result.scannedAt)}</time>
            {' · '}
            {pluralise(result.workflows.length, 'workflow')} checked
          </>
        }
      />

      <section className={styles.readout} aria-label="Scan result">
        <div className={styles.verdict}>
          {entries.length === 0 ? (
            <>
              <p className={styles.clean} data-state="healthy">
                <StatusIcon state="healthy" />
                Nothing to report
              </p>
              <p className={styles.explain}>
                {withHistory === 0
                  ? 'No workflow has execution history yet, so there was nothing to judge.'
                  : `${pluralise(withHistory, 'workflow')} with execution history passed every check. A clean scan only covers the history the instance still holds.`}
              </p>
            </>
          ) : (
            <>
              <p className={styles.caption}>findings</p>
              <p className={styles.total}>{entries.length}</p>
              <ul className={styles.severities}>
                {(['critical', 'warning'] as const).map(
                  (severity) =>
                    bySeverity[severity] > 0 && (
                      <li key={severity}>
                        <StatusLabel
                          state={severity}
                          label={`${bySeverity[severity]} ${severityLabel[severity].toLowerCase()}`}
                        />
                      </li>
                    ),
                )}
              </ul>
            </>
          )}
        </div>

        <ul className={styles.tiles}>
          {healthStates.map((state) => (
            <li key={state} className={styles.tile} data-state={state}>
              <div className={styles.tileHead}>
                <StatusLabel state={state} label={healthLabel[state]} />
                <span className={styles.tileCount}>{counts[state]}</span>
              </div>
              <p className={styles.tileMeaning}>{healthMeaning[state]}</p>
              {counts[state] > 0 && (
                <Link href={`/workflows?state=${state}`} className={styles.tileLink}>
                  <span className="visually-hidden">
                    {pluralise(counts[state], 'workflow')} in state {healthLabel[state]}:{' '}
                  </span>
                  View workflows
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <WorkflowMap workflows={result.workflows} />

      {entries.length > 0 && (
        <section className={styles.attention} aria-labelledby="attention-heading">
          <div className={styles.sectionHead}>
            <h2 id="attention-heading">needs attention</h2>
            <Link href="/findings">
              {entries.length > ATTENTION_LIMIT ? `All ${entries.length} findings` : 'Open findings'}
            </Link>
          </div>
          <ul className={styles.list}>
            {entries.slice(0, ATTENTION_LIMIT).map((entry) => (
              <FindingRow key={entry.key} entry={entry} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
