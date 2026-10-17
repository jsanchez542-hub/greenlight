import type { Metadata } from 'next';
import { NotFoundView } from '@/components/ui/NotFoundView';
import { en } from '@/i18n/en';

export const metadata: Metadata = { title: en.notFound.title };

export default function NotFound() {
  return <NotFoundView />;
}
