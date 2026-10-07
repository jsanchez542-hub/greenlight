import { Suspense } from 'react';
import { FindingsView } from '@/components/findings/FindingsView';
import { en } from '@/i18n/en';

export const metadata = {
  title: en.meta.pages.findings.title,
  description: en.meta.pages.findings.description,
};

export default function Page() {
  return (
    <Suspense>
      <FindingsView />
    </Suspense>
  );
}
