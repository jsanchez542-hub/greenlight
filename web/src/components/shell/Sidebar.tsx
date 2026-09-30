'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatUtc } from '@/lib/format';
import { activeSection, sections, type SectionId } from '@/lib/navigation';
import { useOptionalResult, useScanControls } from '@/lib/scan-context';
import type { SidebarState } from '@/lib/sidebar';
import { Icon } from '../ui/Icon';
import { Logo } from './Logo';
import styles from './Sidebar.module.css';

interface SidebarProps {
  state: SidebarState;
  onToggle: () => void;
}

function useSectionCounts(): Partial<Record<SectionId, number>> {
  const result = useOptionalResult();
  if (result === null) {
    return {};
  }
  return { findings: result.findings.length, workflows: result.workflows.length };
}

export function Sidebar({ state, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { view } = useScanControls();
  const result = useOptionalResult();
  const counts = useSectionCounts();
  const current = activeSection(pathname);
  const collapsed = state === 'collapsed';

  return (
    <aside className={styles.sidebar} aria-label="Primary">
      <div className={styles.brand}>
        <Logo size={32} />
        <span className={styles.brandName}>GreenLight</span>
      </div>

      <nav aria-label="Sections">
        <ul className={styles.nav}>
          {sections.map((section) => {
            const active = current?.id === section.id;
            const count = counts[section.id];
            return (
              <li key={section.id}>
                <Link
                  href={section.href}
                  className={styles.link}
                  aria-current={active ? 'page' : undefined}
                  title={`${section.label} (g ${section.shortcut})`}
                >
                  <Icon name={section.id} />
                  <span className={styles.label}>{section.label}</span>
                  {count !== undefined && <span className={styles.count}>{count}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        <dl className={styles.source}>
          <div>
            <dt>source</dt>
            <dd>{view.kind === 'demo' ? 'Demo data' : 'Live instance'}</dd>
          </div>
          {result !== null && (
            <div>
              <dt>scanned</dt>
              <dd>
                <time dateTime={result.scannedAt}>{formatUtc(result.scannedAt)}</time>
              </dd>
            </div>
          )}
        </dl>
        <p className={styles.hint}>
          <span>
            <kbd>g</kbd> then <kbd>o</kbd> <kbd>f</kbd> <kbd>w</kbd> <kbd>c</kbd>
          </span>
          <span>
            <kbd>/</kbd> search workflows
          </span>
        </p>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggle}
        >
          <Icon name="collapse" />
          <span className={styles.label}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
