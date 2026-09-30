import type { Finding } from 'greenlight';
import styles from './EvidenceList.module.css';

export function EvidenceList({ evidence }: { evidence: Finding['evidence'] }) {
  return (
    <dl className={styles.evidence}>
      {Object.entries(evidence).map(([key, value]) => (
        <div key={key} className={styles.row}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
