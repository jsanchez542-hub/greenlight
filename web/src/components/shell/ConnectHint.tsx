'use client';

import { useMessages } from '@/i18n/context';
import { STATIC_DEMO } from '@/lib/demo';
import { useConnectHint } from '@/lib/use-connect-hint';
import styles from './ConnectHint.module.css';

export function ConnectHint({ placement }: { placement: 'sidebar' | 'tabs' }) {
  const t = useMessages();
  const { visible, dismiss } = useConnectHint();

  if (!visible) {
    return null;
  }
  return (
    <div className={styles.hint} data-placement={placement} role="note">
      <p>{STATIC_DEMO ? t.demo.hint : t.sidebar.connectHint}</p>
      <button type="button" onClick={dismiss}>
        {t.sidebar.connectHintDismiss}
      </button>
    </div>
  );
}
