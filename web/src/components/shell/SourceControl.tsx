'use client';

import { useScanControls } from '@/lib/scan-context';
import { ConnectLink } from '../ui/ConnectLink';
import { Icon } from '../ui/Icon';
import styles from './SourceControl.module.css';

export function SourceControl() {
  const { source, liveAvailable, phase, refreshing, selectLive, selectSample, scanNow } =
    useScanControls();
  const live = source === 'live';

  if (!liveAvailable) {
    return (
      <div className={styles.note}>
        <p className={styles.sampleLabel}>
          <strong>Sample data</strong> <span>not a live instance</span>
        </p>
        <ConnectLink />
      </div>
    );
  }

  return (
    <div className={styles.controls}>
      <div className={styles.switch} role="group" aria-label="Data source">
        <button type="button" aria-pressed={live} onClick={live ? undefined : selectLive}>
          Live instance
        </button>
        <button type="button" aria-pressed={!live} onClick={live ? selectSample : undefined}>
          Sample data
        </button>
      </div>
      {live && phase === 'ready' && (
        <button type="button" className={styles.rescan} disabled={refreshing} onClick={scanNow}>
          <Icon name="scan" />
          {refreshing ? 'Scanning' : 'Scan now'}
        </button>
      )}
    </div>
  );
}
