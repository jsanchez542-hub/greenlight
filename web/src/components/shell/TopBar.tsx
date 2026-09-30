'use client';

import { usePathname } from 'next/navigation';
import { pageLabel } from '@/lib/navigation';
import { decodeSegment } from '@/lib/routes';
import { useScanControls } from '@/lib/scan-context';
import { Freshness } from './Freshness';
import { Logo } from './Logo';
import { SourceControl } from './SourceControl';
import styles from './TopBar.module.css';

function locationOf(pathname: string, source: string): string[] {
  const detail = pathname.split('/').filter(Boolean).slice(1).map(decodeSegment);
  return ['greenlight', source, pageLabel(pathname), ...detail];
}

export function TopBar() {
  const pathname = usePathname();
  const { source } = useScanControls();
  const segments = locationOf(pathname, source);

  return (
    <header className={styles.top}>
      <div className={styles.brand}>
        <Logo size={28} />
        <span>GreenLight</span>
      </div>
      <nav className={styles.path} aria-label="Location">
        <span className={styles.prompt} aria-hidden="true">
          $
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
      </div>
    </header>
  );
}
