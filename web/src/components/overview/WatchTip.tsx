'use client';

import { useScanControls } from '@/lib/scan-context';
import { WATCH_TIP_FLAG } from '@/lib/stored-flag';
import { useStoredFlag } from '@/lib/use-stored-flag';
import { CopyButton } from '../ui/CopyButton';
import styles from './WatchTip.module.css';

const WATCH_COMMAND = 'npm run watch';

export function WatchTip() {
  const { source } = useScanControls();
  const [dismissed, dismiss] = useStoredFlag(WATCH_TIP_FLAG);

  if (source !== 'live' || dismissed) {
    return null;
  }

  return (
    <section className={styles.tip} aria-labelledby="watch-tip-heading">
      <div className={styles.text}>
        <h2 id="watch-tip-heading">Want alerts?</h2>
        <p>
          Run greenlight watch and it tells you when something new appears, so you do not have to look at
          this page. The Watching section of README.md explains where the alerts can go.
        </p>
        <div className={styles.code}>
          <code>{WATCH_COMMAND}</code>
          <CopyButton text={WATCH_COMMAND} label="the watch command" />
        </div>
      </div>
      <button type="button" className={styles.dismiss} onClick={dismiss}>
        Dismiss
      </button>
    </section>
  );
}
