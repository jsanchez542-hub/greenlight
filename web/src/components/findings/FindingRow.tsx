import Link from 'next/link';
import { detectorInfo } from '@/lib/detectors';
import type { KeyedFinding } from '@/lib/findings';
import { findingHref } from '@/lib/routes';
import { severityLabel } from '@/lib/status';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './FindingRow.module.css';

interface FindingRowProps {
  entry: KeyedFinding;
  showWorkflow?: boolean;
}

export function FindingRow({ entry, showWorkflow = true }: FindingRowProps) {
  const { finding } = entry;

  return (
    <li className={styles.row} data-state={finding.severity}>
      <div className={styles.head}>
        <StatusLabel state={finding.severity} label={severityLabel[finding.severity]} />
        <span className={styles.check}>{detectorInfo[finding.detector].label}</span>
        {showWorkflow && <span className={styles.workflow}>{finding.workflowName}</span>}
      </div>
      <p className={styles.summary}>
        <Link href={findingHref(entry.key)} className={styles.link}>
          {finding.summary}
        </Link>
      </p>
    </li>
  );
}
