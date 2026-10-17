import { DemoInstall } from '@/components/demo/DemoInstall';
import { demoPageMetadata } from '@/lib/demo-metadata';

export const metadata = demoPageMetadata('/setup/');

export default function Page() {
  return <DemoInstall />;
}
