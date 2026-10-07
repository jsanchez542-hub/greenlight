'use client';

import Link from 'next/link';
import { useLang, useMessages } from '@/i18n/context';
import { formatUtc } from '@/lib/format';
import { keyFindings } from '@/lib/findings';
import { useResult } from '@/lib/scan-context';
import { healthStates } from '@/lib/status';
import { countByHealth, countBySeverity } from '@/lib/workflows';
import { FindingRow } from '../findings/FindingRow';
import { PageHeader } from '../ui/PageHeader';
import { StatusIcon, StatusLabel } from '../ui/StatusIcon';
import styles from './Overview.module.css';
import { WatchTip } from './WatchTip';
import { WorkflowMap } from './WorkflowMap';

const ATTENTION_LIMIT = 6;

export function Overview() {
  const t = useMessages();
  const lang = useLang();
  const result = useResult();
  const counts = countByHealth(result.workflows);
  const bySeverity = countBySeverity(result.findings);
  const entries = keyFindings(result.findings);
  const withHistory = result.workflows.length - counts['no-runs'];

  if (result.workflows.length === 0) {
    return (
      <>
        <PageHeader title={t.overview.title} meta={t.overview.noWorkflowsMeta} />
        <section className={styles.verdict} aria-labelledby="empty-heading">
          <h2 id="empty-heading" className={styles.clean} data-state="no-runs">
            <StatusIcon state="no-runs" />
            {t.overview.emptyTitle}
          </h2>
          <p className={styles.explain}>{t.overview.emptyBody}</p>
        </section>
        <WatchTip />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t.overview.title}
        meta={
          <>
            {t.overview.scanned} <time dateTime={result.scannedAt}>{formatUtc(result.scannedAt, lang)}</time>
            {' · '}
            {t.overview.checked(result.workflows.length)}
          </>
        }
      />

      <section className={styles.readout} aria-label={t.overview.resultLabel}>
        <div className={styles.verdict}>
          {entries.length === 0 ? (
            <>
              <p className={styles.clean} data-state="healthy">
                <StatusIcon state="healthy" />
                {t.overview.nothing}
              </p>
              <p className={styles.explain}>
                {withHistory === 0 ? t.overview.nothingNoHistory : t.overview.nothingPassed(withHistory)}
              </p>
            </>
          ) : (
            <>
              <p className={styles.caption}>{t.overview.findingsCaption}</p>
              <p className={styles.total}>{entries.length}</p>
              <ul className={styles.severities}>
                {(['critical', 'warning'] as const).map(
                  (severity) =>
                    bySeverity[severity] > 0 && (
                      <li key={severity}>
                        <StatusLabel
                          state={severity}
                          label={t.status.severityCount(severity, bySeverity[severity])}
                        />
                      </li>
                    ),
                )}
              </ul>
            </>
          )}
        </div>

        <ul className={styles.tiles} data-tour="states">
          {healthStates.map((state) => (
            <li key={state} className={styles.tile} data-state={state}>
              <div className={styles.tileHead}>
                {counts[state] > 0 ? (
                  <Link href={`/workflows?state=${state}`} className={styles.tileLink}>
                    <StatusLabel state={state} label={t.status.health[state].label} />
                    <span className="visually-hidden">
                      , {t.count.workflows(counts[state])}. {t.overview.viewWorkflows}
                    </span>
                  </Link>
                ) : (
                  <StatusLabel state={state} label={t.status.health[state].label} />
                )}
                <span className={styles.tileCount}>{counts[state]}</span>
              </div>
              <p className={styles.tileMeaning}>{t.status.health[state].meaning}</p>
            </li>
          ))}
        </ul>
      </section>

      <WatchTip />

      <WorkflowMap workflows={result.workflows} />

      {entries.length > 0 && (
        <section className={styles.attention} aria-labelledby="attention-heading">
          <div className={styles.sectionHead}>
            <h2 id="attention-heading">{t.overview.attention}</h2>
            <Link href="/findings">
              {entries.length > ATTENTION_LIMIT ? t.overview.allFindings(entries.length) : t.overview.openFindings}
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
