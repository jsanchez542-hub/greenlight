import { Suspense } from 'react';
import { WorkflowsView } from '@/components/workflows/WorkflowsView';

export default function Page() {
  return (
    <Suspense>
      <WorkflowsView />
    </Suspense>
  );
}
