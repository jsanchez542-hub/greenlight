import { ChecksView } from '@/components/checks/ChecksView';
import { pageMetadata } from '@/lib/server/metadata';

export const generateMetadata = () => pageMetadata('checks');

export default function Page() {
  return <ChecksView />;
}
