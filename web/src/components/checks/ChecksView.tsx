'use client';

import Link from 'next/link';
import { detectorInfo } from '@/lib/detectors';
import { countFindings, keyFindings } from '@/lib/findings';
import { pluralise } from '@/lib/format';
import { useResult } from '@/lib/scan-context';
import { detectorNames, severityLabel } from '@/lib/status';
import { CheckFacts } from '../ui/CheckFacts';
import { PageHeader } from '../ui/PageHeader';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './ChecksView.module.css';

export function ChecksView() {
  const result = useResult();
  const counts = countFindings(keyFindings(result.findings)).byCheck;

  return (
    <>
      <PageHeader
        title="checks"
        meta="what each check looks for and the defaults it uses"
      />

      <ul className={styles.list}>
        {detectorNames.map((name) => {
          const info = detectorInfo[name];
          return (
            <li key={name} className={styles.check} data-state={info.severity}>
              <header className={styles.head}>
                <h2>{info.label}</h2>
                <StatusLabel state={info.severity} label={`raises ${severityLabel[info.severity].toLowerCase()}`} />
                <Link href={`/findings?check=${name}`} className={styles.count}>
                  {pluralise(counts[name], 'finding')} in this scan
                </Link>
              </header>
              <p className={styles.applies}>
                <span>applies to</span> {info.appliesTo}
              </p>
              <CheckFacts detector={name} columns />
            </li>
          );
        })}
      </ul>
    </>
  );
}
