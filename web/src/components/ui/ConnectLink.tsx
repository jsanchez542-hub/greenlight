'use client';

import Link from 'next/link';
import { useMessages } from '@/i18n/context';
import { SETUP_HREF } from '@/lib/navigation';
import { Icon } from './Icon';
import styles from './ConnectLink.module.css';

export function ConnectLink() {
  const t = useMessages();
  return (
    <Link href={SETUP_HREF} className={styles.button}>
      <Icon name="connect" />
      {t.scan.connectLink}
    </Link>
  );
}
