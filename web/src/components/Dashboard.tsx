'use client';

import type { ScanResult } from 'greenlight';
import { useScanView } from '@/lib/use-scan-view';
import { FindingsSection } from './FindingsSection';
import styles from './Dashboard.module.css';
import { ScanFailure, ScanProgress } from './ScanNotice';
import { ScanSummary } from './ScanSummary';
import { SiteHeader } from './SiteHeader';
import { WorkflowsSection } from './WorkflowsSection';

interface DashboardProps {
  demo: ScanResult;
  liveAvailable: boolean;
}

function ResultView({ result }: { result: ScanResult }) {
  return (
    <>
      <ScanSummary result={result} />
      <FindingsSection findings={result.findings} />
      <WorkflowsSection result={result} />
    </>
  );
}

export function Dashboard({ demo, liveAvailable }: DashboardProps) {
  const { view, showDemo, startScan } = useScanView();

  return (
    <>
      <SiteHeader
        source={view.kind === 'demo' ? 'demo' : 'live'}
        liveAvailable={liveAvailable}
        canRescan={view.kind === 'live'}
        onSelectDemo={showDemo}
        onSelectLive={startScan}
      />
      <main className={styles.main}>
        {view.kind === 'demo' && <ResultView result={demo} />}
        {view.kind === 'live' && <ResultView result={view.result} />}
        {view.kind === 'scanning' && <ScanProgress startedAt={view.startedAt} onCancel={showDemo} />}
        {view.kind === 'failed' && (
          <ScanFailure message={view.message} onRetry={startScan} onShowDemo={showDemo} />
        )}
      </main>
      <footer className={styles.footer}>
        <p>
          GreenLight reads an n8n instance through its API and never writes to it. A scan is a
          snapshot of the execution history the instance still holds, so nothing here shows how a
          workflow changed over time.
        </p>
      </footer>
    </>
  );
}
