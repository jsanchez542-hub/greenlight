'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { connectEntry } from '@/lib/connect-entry';
import { SETUP_HREF, activeSection, sections } from '@/lib/navigation';
import { useScanControls } from '@/lib/scan-context';
import { Icon } from '../ui/Icon';
import { ConnectHint } from './ConnectHint';
import styles from './BottomNav.module.css';

export function BottomNav() {
  const pathname = usePathname();
  const current = activeSection(pathname);
  const { liveAvailable, host } = useScanControls();
  const connect = connectEntry(liveAvailable, host);

  return (
    <nav className={styles.bar} aria-label="Sections">
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
              {section.label}
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
            {connect.label}
          </Link>
        </li>
      </ul>
      <ConnectHint placement="tabs" />
    </nav>
  );
}
