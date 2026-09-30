import type { Finding } from 'greenlight';
import { detectorInfo } from '@/lib/detectors';
import { severityLabel } from '@/lib/status';
import { findingAnchor } from '@/lib/workflows';
import { EvidenceList } from './EvidenceList';
import styles from './FindingsSection.module.css';
import { StatusLabel } from './StatusIcon';

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const info = detectorInfo[finding.detector];

  return (
    <li id={findingAnchor(index)} className={styles.card} data-state={finding.severity}>
      <article aria-labelledby={`${findingAnchor(index)}-title`}>
        <header className={styles.head}>
          <StatusLabel state={finding.severity} label={severityLabel[finding.severity]} />
          <span className={styles.detector}>{info.label}</span>
        </header>
        <h3 id={`${findingAnchor(index)}-title`} className={styles.title}>
          {finding.workflowName}
        </h3>
        <p className={styles.summary}>{finding.summary}</p>
        <EvidenceList evidence={finding.evidence} />
        <details className={styles.about}>
          <summary>About this check</summary>
          <dl>
            <div>
              <dt>Question</dt>
              <dd>{info.question}</dd>
            </div>
            <div>
              <dt>How it decides</dt>
              <dd>{info.method}</dd>
            </div>
            <div>
              <dt>What to review</dt>
              <dd>{info.review}</dd>
            </div>
          </dl>
        </details>
      </article>
    </li>
  );
}

export function FindingsSection({ findings }: { findings: readonly Finding[] }) {
  if (findings.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="findings-heading" className={styles.section}>
      <h2 id="findings-heading" className={styles.heading}>
        Findings <span className={styles.total}>{findings.length}</span>
      </h2>
      <ul className={styles.list}>
        {findings.map((finding, index) => (
          <FindingCard
            key={`${finding.workflowId}-${finding.detector}-${index}`}
            finding={finding}
            index={index}
          />
        ))}
      </ul>
    </section>
  );
}
