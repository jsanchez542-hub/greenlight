import { VERSION } from 'greenlight';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { sampleResult } from '@/lib/sample';
import { SampleScanProvider } from '@/lib/sample-scan-provider';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SampleScanProvider sample={sampleResult}>
      <AppShell version={VERSION}>{children}</AppShell>
    </SampleScanProvider>
  );
}
