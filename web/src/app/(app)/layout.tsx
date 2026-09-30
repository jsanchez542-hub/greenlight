import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { ScanProvider } from '@/lib/scan-context';
import { sampleResult } from '@/lib/sample';
import { isAllowedHost } from '@/lib/server/host';
import { isLiveScanConfigured, liveCache } from '@/lib/server/live-scan';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const liveAvailable = isAllowedHost((await headers()).get('host')) && isLiveScanConfigured();

  return (
    <ScanProvider
      sample={sampleResult}
      liveAvailable={liveAvailable}
      initialSnapshot={liveAvailable ? liveCache().snapshot() : null}
    >
      <AppShell>{children}</AppShell>
    </ScanProvider>
  );
}
