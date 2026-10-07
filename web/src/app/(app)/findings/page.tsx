import { Suspense } from 'react';
import { FindingsView } from '@/components/findings/FindingsView';
import { pageMetadata } from '@/lib/server/metadata';

export const generateMetadata = () => pageMetadata('findings');

export default function Page() {
  return (
    <Suspense>
      <FindingsView />
    </Suspense>
  );
}
