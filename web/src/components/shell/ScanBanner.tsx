'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SETUP_HREF } from '@/lib/navigation';
import { useScanControls } from '@/lib/scan-context';
import { ConnectLink } from '../ui/ConnectLink';
import { StatusIcon } from '../ui/StatusIcon';
import { useDataAge } from './Freshness';
import styles from './ScanBanner.module.css';

export function ScanBanner() {
  const { source, liveAvailable, problem, intervalMinutes, settingsProblem } = useScanControls();
  const age = useDataAge();
  const pathname = usePathname();

  if (settingsProblem !== null) {
    return (
      <div className={styles.banner} data-state="critical" role="alert">
        <StatusIcon state="critical" />
        <p>
          <strong>The settings file cannot be used.</strong> {settingsProblem} Fix it and reload the page.
        </p>
      </div>
    );
  }

  if (source === 'sample') {
    return (
      <p className={styles.banner} role="note">
        <strong>These are invented workflows.</strong>
        {liveAvailable && ' Choose Live instance to see your own.'}
        {!liveAvailable && pathname === '/' && (
          <>
            {' '}
            Connect your n8n to see your own.
            <ConnectLink />
          </>
        )}
        {!liveAvailable && pathname !== '/' && (
          <>
            {' '}
            <Link href={SETUP_HREF}>Connect your n8n to see your own.</Link>
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
          <strong>
            Showing the last successful scan{age === null ? '' : `, ${age.label}`}.
          </strong>{' '}
          The latest attempt failed: {problem}{' '}
          <Link href={SETUP_HREF}>Run the connection check</Link>
        </p>
      </div>
    );
  }

  if (age?.stale) {
    return (
      <div className={styles.banner} data-state="warning" role="status">
        <StatusIcon state="warning" />
        <p>
          <strong>This scan is out of date, {age.label}.</strong> It should refresh every{' '}
          {intervalMinutes} min and has not.
        </p>
      </div>
    );
  }

  return null;
}
