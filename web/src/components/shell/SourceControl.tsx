'use client';

import { useScanControls } from '@/lib/scan-context';
import { Icon } from '../ui/Icon';
import styles from './SourceControl.module.css';

export function SourceControl() {
  const { view, liveAvailable, showDemo, startScan } = useScanControls();
  const live = view.kind !== 'demo';

  if (!liveAvailable) {
    return (
      <p className={styles.note} title="Synthetic workflows produced by GreenLight. No instance is contacted.">
        <span className={styles.pill}>Demo data</span>
        <span className={styles.description}>No instance is contacted</span>
      </p>
    );
  }

  return (
    <div className={styles.controls}>
      <div className={styles.switch} role="group" aria-label="Data source">
        <button type="button" aria-pressed={!live} onClick={live ? showDemo : undefined}>
          Demo data
        </button>
        <button type="button" aria-pressed={live} onClick={live ? undefined : startScan}>
          Live instance
        </button>
      </div>
      {view.kind === 'live' && (
        <button type="button" className={styles.rescan} onClick={startScan}>
          <Icon name="scan" />
          Scan again
        </button>
      )}
    </div>
  );
}
