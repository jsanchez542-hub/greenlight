'use client';

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
        {liveAvailable
          ? ' Choose Live instance to see your own workflows.'
          : ' Set N8N_BASE_URL and N8N_API_KEY in web/.env.local to scan your own n8n.'}
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
          The latest attempt failed: {problem}
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
