'use client';

import { describeFinding } from 'greenlight/i18n';
import Link from 'next/link';
import { useLang, useMessages } from '@/i18n/context';
import type { KeyedFinding } from '@/lib/findings';
import { findingHref } from '@/lib/routes';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './FindingRow.module.css';

interface FindingRowProps {
  entry: KeyedFinding;
  showWorkflow?: boolean;
}

export function FindingRow({ entry, showWorkflow = true }: FindingRowProps) {
  const t = useMessages();
  const lang = useLang();
  const { finding } = entry;

  return (
    <li className={styles.row} data-state={finding.severity}>
      <div className={styles.head}>
        <StatusLabel state={finding.severity} label={t.status.severity[finding.severity]} />
        <span className={styles.check}>{t.checks.detectors[finding.detector].label}</span>
        {showWorkflow && <span className={styles.workflow}>{finding.workflowName}</span>}
      </div>
      <p className={styles.summary}>
        <Link href={findingHref(entry.key)} className={styles.link}>
          {describeFinding(finding, lang)}
        </Link>
      </p>
    </li>
  );
}
