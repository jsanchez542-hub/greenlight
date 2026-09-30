import { Dashboard } from '@/components/Dashboard';
import { demoResult } from '@/lib/demo';
import { isLiveScanConfigured } from '@/lib/server/live-scan';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <Dashboard demo={demoResult} liveAvailable={isLiveScanConfigured()} />;
}
