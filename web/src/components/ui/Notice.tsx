'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatElapsed } from '@/lib/format';
import styles from './Notice.module.css';

function useElapsed(): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((previous) => previous + 1000), 1000);
    return () => clearInterval(timer);
  }, []);

  return elapsed;
}

export function ScanProgress({ onCancel }: { onCancel?: (() => void) | undefined }) {
  const elapsed = useElapsed();

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
      {onCancel !== undefined && (
        <div className={styles.actions}>
          <button type="button" onClick={onCancel}>
            Show sample data meanwhile
          </button>
        </div>
      )}
    </section>
  );
}

interface ScanFailureProps {
  message: string;
  onRetry: () => void;
  onShowSample: () => void;
}

export function ScanFailure({ message, onRetry, onShowSample }: ScanFailureProps) {
  return (
    <section className={styles.notice} data-state="critical" role="alert">
      <h1 className={styles.title}>The scan did not finish</h1>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onRetry}>
          Run the scan again
        </button>
        <button type="button" onClick={onShowSample}>
          Show sample data
        </button>
      </div>
    </section>
  );
}

interface NotInScanProps {
  what: string;
  backHref: string;
  backLabel: string;
}

export function NotInScan({ what, backHref, backLabel }: NotInScanProps) {
  return (
    <section className={styles.notice}>
      <h1 className={styles.title}>Not in this scan</h1>
      <p className={styles.body}>
        {what} does not exist in the result being shown. The data source may have changed since the
        link was made.
      </p>
      <div className={styles.actions}>
        <Link href={backHref} className={styles.linkButton}>
          {backLabel}
        </Link>
      </div>
    </section>
  );
}
