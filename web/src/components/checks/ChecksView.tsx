'use client';

import Link from 'next/link';
import { useMessages } from '@/i18n/context';
import { detectorSeverity } from '@/lib/detectors';
import { countFindings, keyFindings } from '@/lib/findings';
import { useResult } from '@/lib/scan-context';
import { detectorNames } from '@/lib/status';
import { CheckFacts } from '../ui/CheckFacts';
import { PageHeader } from '../ui/PageHeader';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './ChecksView.module.css';

export function ChecksView() {
  const t = useMessages();
  const result = useResult();
  const counts = countFindings(keyFindings(result.findings)).byCheck;

  return (
    <>
      <PageHeader title={t.checks.title} meta={t.checks.meta} />

      <ul className={styles.list}>
        {detectorNames.map((name) => {
          const info = t.checks.detectors[name];
          const severity = detectorSeverity[name];
          return (
            <li key={name} className={styles.check} data-state={severity}>
              <header className={styles.head}>
                <h2>{info.label}</h2>
                <StatusLabel state={severity} label={t.checks.raises(severity)} />
                <Link href={`/findings?check=${name}`} className={styles.count}>
                  {t.checks.inScan(counts[name])}
                </Link>
              </header>
              <p className={styles.applies}>
                <span>{t.checks.appliesTo}</span> {info.appliesTo}
              </p>
              <CheckFacts detector={name} columns />
            </li>
          );
        })}
      </ul>
    </>
  );
}
