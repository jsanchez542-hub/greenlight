'use client';

import { useMessages } from '@/i18n/context';
import { useScanControls } from '@/lib/scan-context';
import { WATCH_TIP_FLAG } from '@/lib/stored-flag';
import { useStoredFlag } from '@/lib/use-stored-flag';
import { CopyButton } from '../ui/CopyButton';
import styles from './WatchTip.module.css';

const WATCH_COMMAND = 'npm run watch';

export function WatchTip() {
  const t = useMessages();
  const { source } = useScanControls();
  const [dismissed, dismiss] = useStoredFlag(WATCH_TIP_FLAG);

  if (source !== 'live' || dismissed) {
    return null;
  }

  return (
    <section className={styles.tip} aria-labelledby="watch-tip-heading">
      <div className={styles.text}>
        <h2 id="watch-tip-heading">{t.overview.watchTitle}</h2>
        <p>{t.overview.watchBody}</p>
        <div className={styles.code}>
          <code>{WATCH_COMMAND}</code>
          <CopyButton text={WATCH_COMMAND} label={t.copy.watchCommand} />
        </div>
      </div>
      <button type="button" className={styles.dismiss} onClick={dismiss}>
        {t.overview.dismiss}
      </button>
    </section>
  );
}
