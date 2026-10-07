import { Suspense } from 'react';
import { WorkflowsView } from '@/components/workflows/WorkflowsView';
import { pageMetadata } from '@/lib/server/metadata';

export const generateMetadata = () => pageMetadata('workflows');

export default function Page() {
  return (
    <Suspense>
      <WorkflowsView />
    </Suspense>
  );
}
