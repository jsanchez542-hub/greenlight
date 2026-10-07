'use client';

import { useMessages } from '@/i18n/context';
import { ageMs, formatAge, isStale } from '@/lib/freshness';
import { useOptionalResult, useScanControls } from '@/lib/scan-context';
import { useNow } from '@/lib/use-now';
import styles from './Freshness.module.css';

export function useDataAge() {
  const t = useMessages();
  const result = useOptionalResult();
  const { source, intervalMinutes } = useScanControls();
  const now = useNow();

  if (source !== 'live' || result === null || now === null) {
    return null;
  }
  const age = ageMs(result.scannedAt, now);
  return {
    label: formatAge(age, t),
    stale: intervalMinutes !== null && isStale(age, intervalMinutes),
  };
}

export function Freshness() {
  const t = useMessages();
  const age = useDataAge();
  const { refreshing } = useScanControls();

  if (age === null && !refreshing) {
    return null;
  }
  return (
    <p className={styles.freshness} data-stale={age?.stale ?? false}>
      {refreshing ? (
        <span>{t.top.refreshing}</span>
      ) : (
        <span>
          {t.top.scanned} <strong>{age?.label}</strong>
        </span>
      )}
    </p>
  );
}
