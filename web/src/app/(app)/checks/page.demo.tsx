import { ChecksView } from '@/components/checks/ChecksView';
import { demoPageMetadata } from '@/lib/demo-metadata';

export const metadata = demoPageMetadata('/checks/');

export default function Page() {
  return <ChecksView />;
}
