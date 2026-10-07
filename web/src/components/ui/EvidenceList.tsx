'use client';

import type { Finding } from 'greenlight';
import { evidenceLabel, evidenceValue } from 'greenlight/i18n';
import { useLang } from '@/i18n/context';
import { formatNumber } from '@/lib/format';
import styles from './EvidenceList.module.css';

export function EvidenceList({ evidence }: { evidence: Finding['evidence'] }) {
  const lang = useLang();

  return (
    <dl className={styles.evidence}>
      {Object.entries(evidence).map(([key, value]) => {
        const label = evidenceLabel(key, lang);
        return (
          <div key={key} className={styles.row}>
            <dt>{typeof label === 'string' ? label : key}</dt>
            <dd>{typeof value === 'number' ? formatNumber(value, lang) : evidenceValue(key, value, lang)}</dd>
          </div>
        );
      })}
    </dl>
  );
}
