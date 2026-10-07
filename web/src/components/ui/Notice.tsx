'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMessages } from '@/i18n/context';
import { failureText, type FailureCode } from '@/lib/failure';
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
  const t = useMessages();
  const elapsed = useElapsed();

  return (
    <section className={styles.notice} aria-labelledby="progress-heading" aria-busy="true">
      <div className={styles.track} aria-hidden="true">
        <span className={styles.runner} />
      </div>
      <h1 id="progress-heading" className={styles.title}>
        {t.scan.progressTitle}
      </h1>
      <p role="status" className={styles.body}>
        {t.scan.progressBody(formatElapsed(elapsed))}
      </p>
      {onCancel !== undefined && (
        <div className={styles.actions}>
          <button type="button" onClick={onCancel}>
            {t.scan.showSampleMeanwhile}
          </button>
        </div>
      )}
    </section>
  );
}

interface ScanFailureProps {
  problem: FailureCode;
  onRetry: () => void;
  onShowSample: () => void;
}

export function ScanFailure({ problem, onRetry, onShowSample }: ScanFailureProps) {
  const t = useMessages();

  return (
    <section className={styles.notice} data-state="critical" role="alert">
      <h1 className={styles.title}>{t.scan.failedTitle}</h1>
      <p className={styles.message}>{failureText(problem, t)}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onRetry}>
          {t.scan.runAgain}
        </button>
        <Link href="/setup" className={styles.linkButton}>
          {t.scan.runCheck}
        </Link>
        <button type="button" onClick={onShowSample}>
          {t.scan.showSample}
        </button>
      </div>
    </section>
  );
}

interface NotInScanProps {
  kind: 'finding' | 'workflow';
  backHref: string;
}

export function NotInScan({ kind, backHref }: NotInScanProps) {
  const t = useMessages();

  return (
    <section className={styles.notice}>
      <h1 className={styles.title}>{t.scan.notInScanTitle}</h1>
      <p className={styles.body}>{t.scan.notInScanBody(kind)}</p>
      <div className={styles.actions}>
        <Link href={backHref} className={styles.linkButton}>
          {kind === 'finding' ? t.scan.backToFindings : t.scan.backToWorkflows}
        </Link>
      </div>
    </section>
  );
}
