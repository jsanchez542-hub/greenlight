'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang, useMessages } from '@/i18n/context';
import { formatUtc } from '@/lib/format';
import { connectEntry } from '@/lib/connect-entry';
import { SETUP_HREF, activeSection, sections, type SectionId } from '@/lib/navigation';
import { useOptionalResult, useScanControls } from '@/lib/scan-context';
import type { SidebarState } from '@/lib/sidebar';
import { Icon } from '../ui/Icon';
import { ConnectHint } from './ConnectHint';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { VersionNote } from './VersionNote';
import styles from './Sidebar.module.css';

interface SidebarProps {
  state: SidebarState;
  onToggle: () => void;
  onTour: () => void;
  version: string;
}

function useSectionCounts(): Partial<Record<SectionId, number>> {
  const result = useOptionalResult();
  if (result === null) {
    return {};
  }
  return { findings: result.findings.length, workflows: result.workflows.length };
}

export function Sidebar({ state, onToggle, onTour, version }: SidebarProps) {
  const t = useMessages();
  const lang = useLang();
  const pathname = usePathname();
  const { source, liveAvailable, host } = useScanControls();
  const connect = connectEntry(liveAvailable, host);
  const result = useOptionalResult();
  const counts = useSectionCounts();
  const current = activeSection(pathname);
  const collapsed = state === 'collapsed';

  return (
    <aside className={styles.sidebar} aria-label={t.nav.primary}>
      <div className={styles.brand} data-tour="brand">
        <Logo size={32} />
        <span className={styles.brandName}>GreenLight</span>
      </div>

      <nav aria-label={t.nav.sections}>
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
                  title={t.nav.sectionTitle(t.nav.labels[section.id], section.shortcut)}
                  data-tour={`nav-${section.id}`}
                >
                  <Icon name={section.id} />
                  <span className={styles.label}>{t.nav.labels[section.id]}</span>
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
          title={connect.connected ? t.sidebar.connectedTitle(connect.host) : t.sidebar.connectTitle}
        >
          <Icon name="connect" />
          <span className={styles.connectText}>
            <span>{connect.connected ? t.sidebar.connected : t.sidebar.connect}</span>
            {connect.connected ? (
              connect.host !== null && <span className={styles.detail}>{connect.host}</span>
            ) : (
              <span className={styles.detail}>{t.sidebar.notConnected}</span>
            )}
          </span>
        </Link>
        <ConnectHint placement="sidebar" />
      </div>

      <div className={styles.footer}>
        <dl className={styles.source}>
          <div>
            <dt>{t.sidebar.source}</dt>
            <dd>{source === 'live' ? t.sidebar.liveInstance : t.sidebar.sampleData}</dd>
          </div>
          {result !== null && (
            <div>
              <dt>{t.sidebar.scanned}</dt>
              <dd>
                <time dateTime={result.scannedAt}>{formatUtc(result.scannedAt, lang)}</time>
              </dd>
            </div>
          )}
        </dl>
        <p className={styles.hint} data-tour="shortcuts">
          <span>
            <kbd>g</kbd> {t.sidebar.shortcutsGo} <kbd>o</kbd> <kbd>f</kbd> <kbd>w</kbd> <kbd>c</kbd>
          </span>
          <span>
            <kbd>/</kbd> {t.sidebar.shortcutsSearch}
          </span>
        </p>
        <LanguageSwitch placement="sidebar" />
        <ThemeToggle placement="sidebar" />
        <button type="button" className={styles.toggle} onClick={onTour} title={t.sidebar.tourTitle}>
          <Icon name="help" />
          <span className={styles.label}>{t.sidebar.tour}</span>
        </button>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t.sidebar.expandLabel : t.sidebar.collapseLabel}
          title={collapsed ? t.sidebar.expandLabel : t.sidebar.collapseLabel}
          onClick={onToggle}
        >
          <Icon name="collapse" />
          <span className={styles.label}>{t.sidebar.collapse}</span>
        </button>
        <VersionNote version={version} placement="sidebar" />
      </div>
    </aside>
  );
}
