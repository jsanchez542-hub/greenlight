'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatUtc } from '@/lib/format';
import { connectEntry } from '@/lib/connect-entry';
import { SETUP_HREF, activeSection, sections, type SectionId } from '@/lib/navigation';
import { useOptionalResult, useScanControls } from '@/lib/scan-context';
import type { SidebarState } from '@/lib/sidebar';
import { Icon } from '../ui/Icon';
import { useDataAge } from './Freshness';
import { ConnectHint } from './ConnectHint';
import { Logo } from './Logo';
import styles from './Sidebar.module.css';

interface SidebarProps {
  state: SidebarState;
  onToggle: () => void;
  onTour: () => void;
}

function useSectionCounts(): Partial<Record<SectionId, number>> {
  const result = useOptionalResult();
  if (result === null) {
    return {};
  }
  return { findings: result.findings.length, workflows: result.workflows.length };
}

export function Sidebar({ state, onToggle, onTour }: SidebarProps) {
  const pathname = usePathname();
  const { source, liveAvailable, host } = useScanControls();
  const connect = connectEntry(liveAvailable, host);
  const age = useDataAge();
  const result = useOptionalResult();
  const counts = useSectionCounts();
  const current = activeSection(pathname);
  const collapsed = state === 'collapsed';

  return (
    <aside className={styles.sidebar} aria-label="Primary">
      <div className={styles.brand} data-tour="brand">
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
                  data-tour={`nav-${section.id}`}
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

      <div className={styles.connectZone}>
        <Link
          href={SETUP_HREF}
          className={`${styles.link} ${styles.connect}`}
          aria-current={pathname === SETUP_HREF ? 'page' : undefined}
          data-emphasis={connect.emphasized}
          title={connect.connected ? `Connected to ${connect.detail ?? 'your n8n'}` : 'Connect your n8n'}
        >
          <Icon name="connect" />
          <span className={styles.connectText}>
            <span>{connect.label}</span>
            {connect.detail !== null && <span className={styles.detail}>{connect.detail}</span>}
          </span>
        </Link>
        <ConnectHint placement="sidebar" />
      </div>

      <div className={styles.footer}>
        <dl className={styles.source}>
          <div>
            <dt>source</dt>
            <dd>{source === 'live' ? 'Live instance' : 'Sample data'}</dd>
          </div>
          {result !== null && (
            <div>
              <dt>scanned</dt>
              <dd>
                <time dateTime={result.scannedAt}>{formatUtc(result.scannedAt)}</time>
                {age !== null && <span className={styles.age}>{age.label}</span>}
              </dd>
            </div>
          )}
        </dl>
        <p className={styles.hint} data-tour="shortcuts">
          <span>
            <kbd>g</kbd> then <kbd>o</kbd> <kbd>f</kbd> <kbd>w</kbd> <kbd>c</kbd>
          </span>
          <span>
            <kbd>/</kbd> search workflows
          </span>
        </p>
        <button type="button" className={styles.toggle} onClick={onTour} title="Take the tour (?)">
          <Icon name="help" />
          <span className={styles.label}>Take the tour</span>
        </button>
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
