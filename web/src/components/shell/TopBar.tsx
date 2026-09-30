'use client';

import { usePathname } from 'next/navigation';
import { activeSection } from '@/lib/navigation';
import { decodeSegment } from '@/lib/routes';
import { useScanControls } from '@/lib/scan-context';
import { Logo } from './Logo';
import { SourceControl } from './SourceControl';
import styles from './TopBar.module.css';

function locationOf(pathname: string, source: string): string[] {
  const section = activeSection(pathname);
  const detail = pathname.split('/').filter(Boolean).slice(1).map(decodeSegment);
  return ['greenlight', source, section?.label.toLowerCase() ?? 'not found', ...detail];
}

export function TopBar() {
  const pathname = usePathname();
  const { view } = useScanControls();
  const segments = locationOf(pathname, view.kind === 'demo' ? 'demo' : 'live');

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
      <SourceControl />
    </header>
  );
}
