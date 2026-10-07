import { SetupView } from '@/components/setup/SetupView';
import { pageMetadata } from '@/lib/server/metadata';

export const generateMetadata = () => pageMetadata('setup');

export default function Page() {
  return <SetupView />;
}
