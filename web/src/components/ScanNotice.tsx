'use client';

import { useEffect, useState } from 'react';
import { formatElapsed } from '@/lib/format';
import styles from './ScanNotice.module.css';

function useElapsed(startedAt: number): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return elapsed;
}

interface ScanProgressProps {
  startedAt: number;
  onCancel: () => void;
}

export function ScanProgress({ startedAt, onCancel }: ScanProgressProps) {
  const elapsed = useElapsed(startedAt);

  return (
    <section className={styles.notice} aria-labelledby="progress-heading" aria-busy="true">
      <div className={styles.track} aria-hidden="true">
        <span className={styles.runner} />
      </div>
      <h1 id="progress-heading" className={styles.title}>
        Scanning the instance
      </h1>
      <p role="status" className={styles.body}>
        Reading the execution history of each workflow, one at a time. On a mid-sized instance this
        takes tens of seconds. Elapsed: {formatElapsed(elapsed)}.
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={onCancel}>
          Cancel and show demo data
        </button>
      </div>
    </section>
  );
}

interface ScanFailureProps {
  message: string;
  onRetry: () => void;
  onShowDemo: () => void;
}

export function ScanFailure({ message, onRetry, onShowDemo }: ScanFailureProps) {
  return (
    <section className={styles.notice} data-state="critical" role="alert">
      <h1 className={styles.title}>The scan did not finish</h1>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onRetry}>
          Run the scan again
        </button>
        <button type="button" onClick={onShowDemo}>
          Show demo data
        </button>
      </div>
    </section>
  );
}
