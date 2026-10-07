'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMessages } from '@/i18n/context';
import { connectEntry } from '@/lib/connect-entry';
import { SETUP_HREF, activeSection, sections } from '@/lib/navigation';
import { useScanControls } from '@/lib/scan-context';
import { Icon } from '../ui/Icon';
import { ConnectHint } from './ConnectHint';
import styles from './BottomNav.module.css';

export function BottomNav() {
  const t = useMessages();
  const pathname = usePathname();
  const current = activeSection(pathname);
  const { liveAvailable, host } = useScanControls();
  const connect = connectEntry(liveAvailable, host);

  return (
    <nav className={styles.bar} aria-label={t.nav.sections}>
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <Link
              href={section.href}
              className={styles.link}
              data-tour={`nav-${section.id}`}
              aria-current={current?.id === section.id ? 'page' : undefined}
            >
              <Icon name={section.id} />
              {t.nav.tabs[section.id]}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href={SETUP_HREF}
            className={styles.link}
            data-emphasis={connect.emphasized}
            aria-current={pathname === SETUP_HREF ? 'page' : undefined}
          >
            <Icon name="connect" />
            {connect.connected ? t.sidebar.connected : t.sidebar.connect}
          </Link>
        </li>
      </ul>
      <ConnectHint placement="tabs" />
    </nav>
  );
}
