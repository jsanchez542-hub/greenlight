import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { sampleResult } from '@/lib/sample';
import { ScanProvider } from '@/lib/scan-context';
import { currentEnvironment } from '@/lib/server/environment';
import { isAllowedHost } from '@/lib/server/host';
import { isLiveScanConfigured, liveCache } from '@/lib/server/live-scan';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const env = currentEnvironment();
  const liveAvailable = isAllowedHost((await headers()).get('host'), env) && isLiveScanConfigured(env);

  return (
    <ScanProvider
      sample={sampleResult}
      liveAvailable={liveAvailable}
      initialSnapshot={liveAvailable ? liveCache(env).snapshot() : null}
    >
      <AppShell>{children}</AppShell>
    </ScanProvider>
  );
}
