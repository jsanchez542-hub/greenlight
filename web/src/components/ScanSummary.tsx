import type { ScanResult } from 'greenlight';
import { formatUtc, pluralise } from '@/lib/format';
import { healthLabel, healthMeaning, healthStates, severityLabel } from '@/lib/status';
import { countByHealth, countBySeverity } from '@/lib/workflows';
import styles from './ScanSummary.module.css';
import { StatusIcon, StatusLabel } from './StatusIcon';

function cleanScanDetail({ workflows }: ScanResult): string {
  const withHistory = workflows.filter((workflow) => workflow.health !== 'no-runs').length;
  if (withHistory === 0) {
    return 'No workflow has execution history yet, so there was nothing to judge.';
  }
  return `${pluralise(withHistory, 'workflow')} with execution history passed every check. A clean scan only covers the history the instance still holds.`;
}

function Headline({ result }: { result: ScanResult }) {
  const { findings } = result;

  if (findings.length === 0) {
    return (
      <div className={styles.headline} data-state="healthy">
        <p className={styles.verdict}>
          <StatusIcon state="healthy" />
          Nothing to report
        </p>
        <p className={styles.detail}>{cleanScanDetail(result)}</p>
      </div>
    );
  }

  const bySeverity = countBySeverity(findings);
  return (
    <div className={styles.headline}>
      <p className={styles.count}>{findings.length}</p>
      <p className={styles.verdict}>{findings.length === 1 ? 'finding' : 'findings'}</p>
      <ul className={styles.severities}>
        {(['critical', 'warning'] as const).map(
          (severity) =>
            bySeverity[severity] > 0 && (
              <li key={severity}>
                <StatusLabel state={severity} label={`${bySeverity[severity]} ${severityLabel[severity].toLowerCase()}`} />
              </li>
            ),
        )}
      </ul>
    </div>
  );
}

function HealthDistribution({ result }: { result: ScanResult }) {
  const counts = countByHealth(result.workflows);
  const total = result.workflows.length;
  const description = healthStates
    .filter((state) => counts[state] > 0)
    .map((state) => `${counts[state]} ${healthLabel[state].toLowerCase()}`)
    .join(', ');

  return (
    <div className={styles.distribution}>
      {total > 0 && (
        <div className={styles.bar} role="img" aria-label={`${pluralise(total, 'workflow')}: ${description}`}>
          {healthStates.map(
            (state) =>
              counts[state] > 0 && (
                <span
                  key={state}
                  className={styles.segment}
                  data-state={state}
                  style={{ flexGrow: counts[state] }}
                />
              ),
          )}
        </div>
      )}
      <ul className={styles.legend}>
        {healthStates.map((state) => (
          <li key={state} className={counts[state] === 0 ? styles.empty : undefined}>
            <StatusLabel state={state} label={healthLabel[state]} />
            <span className={styles.number}>{counts[state]}</span>
            <span className={styles.meaning}>{healthMeaning[state]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScanSummary({ result }: { result: ScanResult }) {
  return (
    <section className={styles.summary} aria-labelledby="summary-heading">
      <h1 id="summary-heading" className="visually-hidden">
        Scan summary
      </h1>
      <p className={styles.meta}>
        Scanned <time dateTime={result.scannedAt}>{formatUtc(result.scannedAt)}</time>
        <span aria-hidden="true"> · </span>
        {pluralise(result.workflows.length, 'workflow')} checked
      </p>
      <div className={styles.panel}>
        <Headline result={result} />
        <HealthDistribution result={result} />
      </div>
    </section>
  );
}
