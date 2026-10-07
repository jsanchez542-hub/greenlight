'use client';

import { useMessages } from '@/i18n/context';
import { useScanControls } from '@/lib/scan-context';
import { Icon } from '../ui/Icon';
import styles from './SourceControl.module.css';

export function SourceControl() {
  const t = useMessages();
  const { source, liveAvailable, phase, refreshing, selectLive, selectSample, scanNow } =
    useScanControls();
  const live = source === 'live';

  if (!liveAvailable) {
    return (
      <p className={styles.sampleLabel}>
        <strong>{t.top.sample}</strong>
        <span className={styles.qualifier}>{t.top.notLive}</span>
      </p>
    );
  }

  return (
    <div className={styles.controls}>
      <div className={styles.switch} role="group" aria-label={t.top.sourceGroup}>
        <button type="button" aria-pressed={live} onClick={live ? undefined : selectLive}>
          <span className={styles.full}>{t.top.liveFull}</span>
          <span className={styles.short}>{t.top.liveShort}</span>
        </button>
        <button type="button" aria-pressed={!live} onClick={live ? selectSample : undefined}>
          <span className={styles.full}>{t.top.sampleFull}</span>
          <span className={styles.short}>{t.top.sampleShort}</span>
        </button>
      </div>
      {live && phase === 'ready' && (
        <button type="button" className={styles.rescan} disabled={refreshing} onClick={scanNow}>
          <Icon name="scan" />
          <span className={styles.extra}>{refreshing ? t.top.scanning : t.top.scanNow}</span>
        </button>
      )}
    </div>
  );
}
