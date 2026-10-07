'use client';

import { usePathname } from 'next/navigation';
import { useMessages } from '@/i18n/context';
import type { Messages } from '@/i18n';
import { pageLabel } from '@/lib/navigation';
import { decodeSegment } from '@/lib/routes';
import { useScanControls } from '@/lib/scan-context';
import { Freshness } from './Freshness';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import { SourceControl } from './SourceControl';
import { ThemeToggle } from './ThemeToggle';
import styles from './TopBar.module.css';

function locationOf(pathname: string, source: 'live' | 'sample', t: Messages): string[] {
  const detail = pathname.split('/').filter(Boolean).slice(1).map(decodeSegment);
  return ['greenlight', t.nav.sources[source], pageLabel(pathname, t), ...detail];
}

export function TopBar() {
  const t = useMessages();
  const pathname = usePathname();
  const { source } = useScanControls();
  const segments = locationOf(pathname, source, t);

  return (
    <header className={styles.top}>
      <div className={styles.brand} data-tour="brand">
        <Logo size={28} />
        <span className={styles.brandName}>GreenLight</span>
      </div>
      <nav className={styles.path} aria-label={t.nav.location}>
        <span className={styles.prompt} aria-hidden="true">
          &gt;
        </span>
        <ol>
          {segments.map((segment, index) => (
            <li key={`${index}-${segment}`} aria-current={index === segments.length - 1 ? 'page' : undefined}>
              {segment}
            </li>
          ))}
        </ol>
      </nav>
      <div className={styles.right}>
        <Freshness />
        <SourceControl />
        <LanguageSwitch placement="top" />
        <ThemeToggle placement="top" />
      </div>
    </header>
  );
}
