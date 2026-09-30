'use client';

import { useScanControls } from '@/lib/scan-context';
import { Icon } from '../ui/Icon';
import styles from './SourceControl.module.css';

export function SourceControl() {
  const { source, liveAvailable, phase, refreshing, selectLive, selectSample, scanNow } =
    useScanControls();
  const live = source === 'live';

  if (!liveAvailable) {
    return (
      <p className={styles.sampleLabel}>
        <strong>Sample data</strong>
        <span className={styles.qualifier}>· not a live instance</span>
      </p>
    );
  }

  return (
    <div className={styles.controls}>
      <div className={styles.switch} role="group" aria-label="Data source">
        <button type="button" aria-pressed={live} onClick={live ? undefined : selectLive}>
          Live<span className={styles.extra}> instance</span>
        </button>
        <button type="button" aria-pressed={!live} onClick={live ? selectSample : undefined}>
          Sample<span className={styles.extra}> data</span>
        </button>
      </div>
      {live && phase === 'ready' && (
        <button type="button" className={styles.rescan} disabled={refreshing} onClick={scanNow}>
          <Icon name="scan" />
          <span className={styles.extra}>{refreshing ? 'Scanning' : 'Scan now'}</span>
        </button>
      )}
    </div>
  );
}
