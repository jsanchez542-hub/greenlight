import { DemoInstall } from '@/components/demo/DemoInstall';
import { en } from '@/i18n/en';

export const metadata = {
  title: en.demo.pageTitle,
  description: en.demo.pageDescription,
};

export default function Page() {
  return <DemoInstall />;
}
