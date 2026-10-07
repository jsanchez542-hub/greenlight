'use client';

import type { ReactNode } from 'react';
import { useMessages } from '@/i18n/context';
import { SETUP_HREF } from '@/lib/navigation';
import { useScanControls } from '@/lib/scan-context';
import { useOnboarding } from '@/lib/use-onboarding';
import { useShortcuts } from '@/lib/use-shortcuts';
import { useSidebar } from '@/lib/use-sidebar';
import { usePath } from '@/lib/use-path';
import { Onboarding } from '../onboarding/Onboarding';
import { ScanFailure, ScanProgress } from '../ui/Notice';
import styles from './AppShell.module.css';
import { BottomNav } from './BottomNav';
import { ScanBanner } from './ScanBanner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { VersionNote } from './VersionNote';

function Content({ children }: { children: ReactNode }) {
  const { phase, problem, liveAvailable, selectSample, scanNow } = useScanControls();
  const pathname = usePath();

  if (pathname === SETUP_HREF) {
    return children;
  }

  switch (phase) {
    case 'connecting':
      return <ScanProgress onCancel={liveAvailable ? selectSample : undefined} />;
    case 'failed':
      return <ScanFailure problem={problem ?? 'scanFailed'} onRetry={scanNow} onShowSample={selectSample} />;
    default:
      return (
        <>
          <ScanBanner />
          {children}
        </>
      );
  }
}

export function AppShell({ children, version }: { children: ReactNode; version: string }) {
  const t = useMessages();
  const sidebar = useSidebar();
  const { liveAvailable } = useScanControls();
  const onboarding = useOnboarding();
  useShortcuts(onboarding.startTour);

  return (
    <div className={styles.shell} data-sidebar={sidebar.state}>
      <a href="#content" className={styles.skip}>
        {t.nav.skip}
      </a>
      <Sidebar state={sidebar.state} onToggle={sidebar.toggle} onTour={onboarding.startTour} version={version} />
      <div className={styles.column}>
        <TopBar />
        <main id="content" className={styles.main} tabIndex={-1}>
          <Content>{children}</Content>
        </main>
        <VersionNote version={version} placement="page" />
      </div>
      <BottomNav />
      <Onboarding
        state={onboarding.state}
        liveAvailable={liveAvailable}
        onStartTour={onboarding.startTour}
        onNext={onboarding.next}
        onBack={onboarding.back}
        onClose={onboarding.close}
        onSkipWelcome={onboarding.skipWelcome}
        onWelcomeShown={onboarding.welcomeShown}
      />
    </div>
  );
}
