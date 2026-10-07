import { Suspense } from 'react';
import { WorkflowsView } from '@/components/workflows/WorkflowsView';
import { en } from '@/i18n/en';

export const metadata = {
  title: en.meta.pages.workflows.title,
  description: en.meta.pages.workflows.description,
};

export default function Page() {
  return (
    <Suspense>
      <WorkflowsView />
    </Suspense>
  );
}
