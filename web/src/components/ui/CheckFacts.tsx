import type { DetectorName } from 'greenlight';
import { detectorInfo } from '@/lib/detectors';
import styles from './CheckFacts.module.css';

interface CheckFactsProps {
  detector: DetectorName;
  columns?: boolean;
}

export function CheckFacts({ detector, columns = false }: CheckFactsProps) {
  const info = detectorInfo[detector];

  return (
    <div className={columns ? `${styles.facts} ${styles.columns}` : styles.facts}>
      <section>
        <h3>Question</h3>
        <p>{info.question}</p>
      </section>
      <section>
        <h3>How it decides</h3>
        <p>{info.method}</p>
        <dl className={styles.thresholds}>
          {info.thresholds.map((threshold) => (
            <div key={`${threshold.name}-${threshold.value}`}>
              <dt>{threshold.name}</dt>
              <dd>{threshold.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h3>What to review</h3>
        <p>{info.review}</p>
      </section>
    </div>
  );
}
