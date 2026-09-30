import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { demoResult } from '@/lib/demo';
import { ScanProvider } from '@/lib/scan-context';
import { isLiveScanConfigured } from '@/lib/server/live-scan';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ScanProvider demo={demoResult} liveAvailable={isLiveScanConfigured()}>
      <AppShell>{children}</AppShell>
    </ScanProvider>
  );
}
