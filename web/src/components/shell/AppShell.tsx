'use client';

import type { ReactNode } from 'react';
import { useScanControls } from '@/lib/scan-context';
import { useShortcuts } from '@/lib/use-shortcuts';
import { useSidebar } from '@/lib/use-sidebar';
import { ScanFailure, ScanProgress } from '../ui/Notice';
import styles from './AppShell.module.css';
import { BottomNav } from './BottomNav';
import { ScanBanner } from './ScanBanner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

function Content({ children }: { children: ReactNode }) {
  const { phase, problem, liveAvailable, selectSample, scanNow } = useScanControls();

  switch (phase) {
    case 'connecting':
      return <ScanProgress onCancel={liveAvailable ? selectSample : undefined} />;
    case 'failed':
      return <ScanFailure message={problem ?? ''} onRetry={scanNow} onShowSample={selectSample} />;
    default:
      return (
        <>
          <ScanBanner />
          {children}
        </>
      );
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const sidebar = useSidebar();
  useShortcuts();

  return (
    <div className={styles.shell} data-sidebar={sidebar.state}>
      <a href="#content" className={styles.skip}>
        Skip to content
      </a>
      <Sidebar state={sidebar.state} onToggle={sidebar.toggle} />
      <div className={styles.column}>
        <TopBar />
        <main id="content" className={styles.main} tabIndex={-1}>
          <Content>{children}</Content>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
