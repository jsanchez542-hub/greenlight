import { DemoInstall } from '@/components/demo/DemoInstall';
import { en } from '@/i18n/en';

export const metadata = {
  title: en.meta.pages.setup.title,
  description: en.meta.pages.setup.description,
};

export default function Page() {
  return <DemoInstall />;
}
