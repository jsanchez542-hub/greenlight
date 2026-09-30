import Link from 'next/link';
import { SETUP_HREF } from '@/lib/navigation';
import { Icon } from './Icon';
import styles from './ConnectLink.module.css';

export function ConnectLink({ label = 'Connect your n8n' }: { label?: string }) {
  return (
    <Link href={SETUP_HREF} className={styles.button}>
      <Icon name="connect" />
      {label}
    </Link>
  );
}
