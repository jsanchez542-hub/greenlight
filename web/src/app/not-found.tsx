import type { Metadata } from 'next';
import { NotFoundView } from '@/components/ui/NotFoundView';
import { currentMessages } from '@/lib/server/language';

export async function generateMetadata(): Promise<Metadata> {
  const t = await currentMessages();
  return { title: t.notFound.title };
}

export default function NotFound() {
  return <NotFoundView />;
}
