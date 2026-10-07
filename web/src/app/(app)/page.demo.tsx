import { Overview } from '@/components/overview/Overview';
import { en } from '@/i18n/en';

export const metadata = {
  title: en.meta.pages.overview.title,
  description: en.meta.pages.overview.description,
};

export default function Page() {
  return <Overview />;
}
