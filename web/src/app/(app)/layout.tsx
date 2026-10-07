import { headers } from 'next/headers';
import { VERSION } from 'greenlight';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { sampleResult } from '@/lib/sample';
import { ScanProvider } from '@/lib/scan-context';
import type { FailureCode } from '@/lib/failure';
import { currentEnvironment, environmentProblem, type Environment } from '@/lib/server/environment';
import { isAllowedHost } from '@/lib/server/host';
import { isLiveScanConfigured, liveCache } from '@/lib/server/live-scan';

export const dynamic = 'force-dynamic';

function readSettings(): { env: Environment; problem: FailureCode | null } {
  try {
    return { env: currentEnvironment(), problem: null };
  } catch (error) {
    return { env: {}, problem: environmentProblem(error) };
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { env, problem } = readSettings();
  const hostAllowed = isAllowedHost((await headers()).get('host'), env);
  const liveAvailable = hostAllowed && problem === null && isLiveScanConfigured(env);

  return (
    <ScanProvider
      sample={sampleResult}
      liveAvailable={liveAvailable}
      settingsProblem={hostAllowed ? problem : null}
      initialSnapshot={liveAvailable ? liveCache(env).snapshot() : null}
    >
      <AppShell version={VERSION}>{children}</AppShell>
    </ScanProvider>
  );
}
