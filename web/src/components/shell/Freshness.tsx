'use client';

import { ageMs, formatAge, isStale } from '@/lib/freshness';
import { useOptionalResult, useScanControls } from '@/lib/scan-context';
import { useNow } from '@/lib/use-now';
import styles from './Freshness.module.css';

export function useDataAge() {
  const result = useOptionalResult();
  const { source, intervalMinutes } = useScanControls();
  const now = useNow();

  if (source !== 'live' || result === null || now === null) {
    return null;
  }
  const age = ageMs(result.scannedAt, now);
  return {
    label: formatAge(age),
    stale: intervalMinutes !== null && isStale(age, intervalMinutes),
  };
}

export function Freshness() {
  const age = useDataAge();
  const { refreshing } = useScanControls();

  if (age === null && !refreshing) {
    return null;
  }
  return (
    <p className={styles.freshness} data-stale={age?.stale ?? false}>
      {refreshing ? (
        <span>refreshing</span>
      ) : (
        <span>
          scanned <strong>{age?.label}</strong>
        </span>
      )}
    </p>
  );
}
