'use client';

import type { ReactNode } from 'react';
import { useScanControls } from '@/lib/scan-context';
import { useShortcuts } from '@/lib/use-shortcuts';
import { useSidebar } from '@/lib/use-sidebar';
import { ScanFailure, ScanProgress } from '../ui/Notice';
import styles from './AppShell.module.css';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

function Content({ children }: { children: ReactNode }) {
  const { view, showDemo, startScan } = useScanControls();

  switch (view.kind) {
    case 'scanning':
      return <ScanProgress startedAt={view.startedAt} onCancel={showDemo} />;
    case 'failed':
      return <ScanFailure message={view.message} onRetry={startScan} onShowDemo={showDemo} />;
    default:
      return children;
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
