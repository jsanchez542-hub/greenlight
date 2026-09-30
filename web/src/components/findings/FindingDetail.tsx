'use client';

import Link from 'next/link';
import { detectorInfo } from '@/lib/detectors';
import { keyFindings } from '@/lib/findings';
import { workflowHref } from '@/lib/routes';
import { useResult } from '@/lib/scan-context';
import { severityLabel } from '@/lib/status';
import { CheckFacts } from '../ui/CheckFacts';
import { EvidenceList } from '../ui/EvidenceList';
import { NotInScan } from '../ui/Notice';
import { PageHeader } from '../ui/PageHeader';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './FindingDetail.module.css';

export function FindingDetail({ findingKey }: { findingKey: string }) {
  const result = useResult();
  const entry = keyFindings(result.findings).find((candidate) => candidate.key === findingKey);

  if (entry === undefined) {
    return <NotInScan what="This finding" backHref="/findings" backLabel="Back to findings" />;
  }

  const { finding } = entry;
  const info = detectorInfo[finding.detector];

  return (
    <>
      <PageHeader
        title={finding.workflowName}
        meta={`${info.label} · ${severityLabel[finding.severity].toLowerCase()}`}
        actions={
          <Link href="/findings" className={styles.back}>
            All findings
          </Link>
        }
      />

      <section className={styles.panel} data-state={finding.severity} aria-labelledby="summary-heading">
        <h2 id="summary-heading" className={styles.heading}>
          <StatusLabel state={finding.severity} label={severityLabel[finding.severity]} />
          <span>{info.label}</span>
        </h2>
        <p className={styles.summary}>{finding.summary}</p>
        <Link href={workflowHref(finding.workflowId)} className={styles.workflowLink}>
          Open workflow {finding.workflowName}
        </Link>
      </section>

      <section className={styles.block} aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className={styles.blockTitle}>
          evidence
        </h2>
        <EvidenceList evidence={finding.evidence} />
      </section>

      <section className={styles.block} aria-labelledby="about-heading">
        <h2 id="about-heading" className={styles.blockTitle}>
          about this check
        </h2>
        <CheckFacts detector={finding.detector} />
        <Link href="/checks" className={styles.workflowLink}>
          All checks
        </Link>
      </section>
    </>
  );
}
