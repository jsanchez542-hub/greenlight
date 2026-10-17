import { Suspense } from 'react';
import { FindingsView } from '@/components/findings/FindingsView';
import { demoPageMetadata } from '@/lib/demo-metadata';

export const metadata = demoPageMetadata('/findings/');

export default function Page() {
  return (
    <Suspense>
      <FindingsView />
    </Suspense>
  );
}
