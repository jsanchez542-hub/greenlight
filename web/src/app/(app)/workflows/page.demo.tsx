import { Suspense } from 'react';
import { WorkflowsView } from '@/components/workflows/WorkflowsView';
import { demoPageMetadata } from '@/lib/demo-metadata';

export const metadata = demoPageMetadata('/workflows/');

export default function Page() {
  return (
    <Suspense>
      <WorkflowsView />
    </Suspense>
  );
}
