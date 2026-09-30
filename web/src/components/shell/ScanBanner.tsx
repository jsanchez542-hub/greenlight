'use client';

import Link from 'next/link';
import { SETUP_HREF } from '@/lib/navigation';
import { useScanControls } from '@/lib/scan-context';
import { StatusIcon } from '../ui/StatusIcon';
import { useDataAge } from './Freshness';
import styles from './ScanBanner.module.css';

export function ScanBanner() {
  const { source, liveAvailable, problem, intervalMinutes } = useScanControls();
  const age = useDataAge();

  if (source === 'sample') {
    return (
      <p className={styles.banner} role="note">
        <strong>Sample data, not a live instance.</strong>
        {liveAvailable ? (
          ' Choose Live instance to see your own workflows.'
        ) : (
          <>
            {' '}
            <Link href={SETUP_HREF}>Connect your n8n</Link> to see your own workflows.
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
