import { ChecksView } from '@/components/checks/ChecksView';
import { en } from '@/i18n/en';

export const metadata = {
  title: en.meta.pages.checks.title,
  description: en.meta.pages.checks.description,
};

export default function Page() {
  return <ChecksView />;
}
