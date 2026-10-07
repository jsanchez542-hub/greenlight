'use client';

import { describeFinding } from 'greenlight/i18n';
import Link from 'next/link';
import { useLang, useMessages } from '@/i18n/context';
import { keyFindings } from '@/lib/findings';
import { routeKey, workflowHref } from '@/lib/routes';
import { useResult } from '@/lib/scan-context';
import { CheckFacts } from '../ui/CheckFacts';
import { EvidenceList } from '../ui/EvidenceList';
import { NotInScan } from '../ui/Notice';
import { PageHeader } from '../ui/PageHeader';
import { StatusLabel } from '../ui/StatusIcon';
import styles from './FindingDetail.module.css';

export function FindingDetail({ findingKey }: { findingKey: string }) {
  const t = useMessages();
  const lang = useLang();
  const result = useResult();
  const entry = keyFindings(result.findings).find((candidate) => routeKey(candidate.key) === findingKey);

  if (entry === undefined) {
    return <NotInScan kind="finding" backHref="/findings" />;
  }

  const { finding } = entry;

  return (
    <>
      <PageHeader
        title={finding.workflowName}
        actions={
          <Link href="/findings" className={styles.back}>
            {t.findings.all}
          </Link>
        }
      />

      <section className={styles.panel} data-state={finding.severity} aria-labelledby="summary-heading">
        <h2 id="summary-heading" className={styles.heading}>
          <StatusLabel state={finding.severity} label={t.status.severity[finding.severity]} />
          <span>{t.checks.detectors[finding.detector].label}</span>
        </h2>
        <p className={styles.summary}>{describeFinding(finding, lang)}</p>
        <Link href={workflowHref(finding.workflowId)} className={styles.workflowLink}>
          {t.findings.openWorkflow(finding.workflowName)}
        </Link>
      </section>

      <section className={styles.block} aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className={styles.blockTitle}>
          {t.findings.evidence}
        </h2>
        <EvidenceList evidence={finding.evidence} />
      </section>

      <section className={styles.block} aria-labelledby="about-heading">
        <h2 id="about-heading" className={styles.blockTitle}>
          {t.findings.about}
        </h2>
        <CheckFacts detector={finding.detector} />
        <Link href="/checks" className={styles.workflowLink}>
          {t.findings.allChecks}
        </Link>
      </section>
    </>
  );
}
