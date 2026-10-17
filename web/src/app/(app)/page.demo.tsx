import { Overview } from '@/components/overview/Overview';
import { demoPageMetadata } from '@/lib/demo-metadata';

export const metadata = demoPageMetadata('/');

export default function Page() {
  return <Overview />;
}
