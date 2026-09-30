'use client';

import { CONNECT_HINT_TEXT } from '@/lib/connect-entry';
import { useConnectHint } from '@/lib/use-connect-hint';
import styles from './ConnectHint.module.css';

export function ConnectHint({ placement }: { placement: 'sidebar' | 'tabs' }) {
  const { visible, dismiss } = useConnectHint();

  if (!visible) {
    return null;
  }
  return (
    <div className={styles.hint} data-placement={placement} role="note">
      <p>{CONNECT_HINT_TEXT}</p>
      <button type="button" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
