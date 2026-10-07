'use client';

import Link from 'next/link';
import { useMessages } from '@/i18n/context';
import { STATIC_DEMO } from '@/lib/demo';
import { failureText } from '@/lib/failure';
import { SETUP_HREF } from '@/lib/navigation';
import { useScanControls } from '@/lib/scan-context';
import { usePath } from '@/lib/use-path';
import { ConnectLink } from '../ui/ConnectLink';
import { StatusIcon } from '../ui/StatusIcon';
import { useDataAge } from './Freshness';
import styles from './ScanBanner.module.css';

export function ScanBanner() {
  const t = useMessages();
  const { source, liveAvailable, problem, intervalMinutes, settingsProblem } = useScanControls();
  const age = useDataAge();
  const pathname = usePath();

  if (settingsProblem !== null) {
    return (
      <div className={styles.banner} data-state="critical" role="alert">
        <StatusIcon state="critical" />
        <p>
          <strong>{t.scan.settingsBroken}</strong> {failureText(settingsProblem, t)} {t.scan.settingsFix}
        </p>
      </div>
    );
  }

  if (source === 'sample' && STATIC_DEMO) {
    return (
      <p className={styles.banner} role="note">
        <strong>{t.demo.banner}</strong>{' '}
        {pathname === '/' ? (
          <>
            {t.demo.bannerLink}
            <ConnectLink />
          </>
        ) : (
          <Link href={SETUP_HREF}>{t.demo.bannerLink}</Link>
        )}
      </p>
    );
  }

  if (source === 'sample') {
    return (
      <p className={styles.banner} role="note">
        <strong>{t.scan.invented}</strong>
        {liveAvailable && t.scan.chooseLive}
        {!liveAvailable && pathname === '/' && (
          <>
            {' '}
            {t.scan.connectToSee}
            <ConnectLink />
          </>
        )}
        {!liveAvailable && pathname !== '/' && (
          <>
            {' '}
            <Link href={SETUP_HREF}>{t.scan.connectToSee}</Link>
          </>
        )}
      </p>
    );
  }

  if (problem !== null) {
    return (
      <div className={styles.banner} data-state="warning" role="alert">
        <StatusIcon state="warning" />
        <p>
          <strong>{t.scan.lastGood(age === null ? null : age.label)}</strong> {t.scan.attemptFailed}{' '}
          {failureText(problem, t)} <Link href={SETUP_HREF}>{t.scan.runCheck}</Link>
        </p>
      </div>
    );
  }

  if (age?.stale) {
    return (
      <div className={styles.banner} data-state="warning" role="status">
        <StatusIcon state="warning" />
        <p>
          <strong>{t.scan.outOfDate(age.label)}</strong> {t.scan.shouldRefresh(intervalMinutes ?? 0)}
        </p>
      </div>
    );
  }

  return null;
}
