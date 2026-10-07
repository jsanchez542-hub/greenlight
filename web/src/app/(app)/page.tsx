import { Overview } from '@/components/overview/Overview';
import { pageMetadata } from '@/lib/server/metadata';

export const generateMetadata = () => pageMetadata('overview');

export default function Page() {
  return <Overview />;
}
