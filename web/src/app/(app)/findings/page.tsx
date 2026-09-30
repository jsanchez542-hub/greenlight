import { Suspense } from 'react';
import { FindingsView } from '@/components/findings/FindingsView';

export default function Page() {
  return (
    <Suspense>
      <FindingsView />
    </Suspense>
  );
}
