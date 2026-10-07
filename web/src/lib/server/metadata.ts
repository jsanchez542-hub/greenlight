import type { Metadata } from 'next';
import type { Messages } from '@/i18n';
import { currentMessages } from './language';

export async function pageMetadata(page: keyof Messages['meta']['pages']): Promise<Metadata> {
  const { title, description } = (await currentMessages()).meta.pages[page];
  return { title, description };
}
