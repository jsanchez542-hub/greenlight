'use client';

import { useMessages } from '@/i18n/context';
import { useUpdates } from '@/lib/updates-context';
import styles from './UpdateNotice.module.css';

export function UpdateNotice({ variant }: { variant: 'note' | 'banner' }) {
  const t = useMessages();
  const { notice, dismiss } = useUpdates();

  if (notice === null) {
    return null;
  }
  return (
    <div className={styles.notice} data-variant={variant} role="note">
      <p>
        {t.updates.available(notice.latest)}{' '}
        <a href={notice.url} target="_blank" rel="noopener noreferrer">
          {t.updates.whatChanged}
          <span className="visually-hidden">{t.setup.form.newTab}</span>
        </a>
      </p>
      <button type="button" onClick={dismiss}>
        {t.updates.dismiss}
      </button>
    </div>
  );
}
