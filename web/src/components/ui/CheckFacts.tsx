'use client';

import type { DetectorName } from 'greenlight';
import { useMessages } from '@/i18n/context';
import styles from './CheckFacts.module.css';

interface CheckFactsProps {
  detector: DetectorName;
  columns?: boolean;
}

export function CheckFacts({ detector, columns = false }: CheckFactsProps) {
  const t = useMessages();
  const info = t.checks.detectors[detector];

  return (
    <div className={columns ? `${styles.facts} ${styles.columns}` : styles.facts}>
      <section>
        <h3>{t.checks.question}</h3>
        <p>{info.question}</p>
      </section>
      <section>
        <h3>{t.checks.howItDecides}</h3>
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
        <h3>{t.checks.whatToReview}</h3>
        <p>{info.review}</p>
      </section>
    </div>
  );
}
