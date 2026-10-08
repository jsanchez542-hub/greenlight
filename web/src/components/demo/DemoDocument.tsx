'use client';

import { useEffect } from 'react';
import { useMessages } from '@/i18n/context';
import type { Messages } from '@/i18n';
import { normalizePath } from '@/lib/navigation';
import { usePath } from '@/lib/use-path';

type Page = keyof Messages['meta']['pages'];

export function pageOf(pathname: string): Page | 'notFound' {
  const path = normalizePath(pathname);
  if (path === '/') {
    return 'overview';
  }
  const [first, second] = path.split('/').filter(Boolean);
  const pages: Record<string, [Page, Page]> = {
    findings: ['findings', 'finding'],
    workflows: ['workflows', 'workflow'],
    checks: ['checks', 'checks'],
    setup: ['setup', 'setup'],
  };
  const entry = first === undefined ? undefined : Object.hasOwn(pages, first) ? pages[first] : undefined;
  if (entry === undefined) {
    return 'notFound';
  }
  return second === undefined ? entry[0] : entry[1];
}

export function documentTexts(pathname: string, t: Messages): { title: string; description: string } {
  const page = pageOf(pathname);
  if (page === 'notFound') {
    return { title: `${t.notFound.title} · ${t.meta.title}`, description: t.meta.description };
  }
  const { title, description } = page === 'setup' ? { title: t.demo.pageTitle, description: t.demo.pageDescription } : t.meta.pages[page];
  return { title: `${title} · ${t.meta.title}`, description };
}

/** The pages are built in English; this gives the title and the description of the page in the language of the visitor. */
export function DemoDocument() {
  const t = useMessages();
  const pathname = usePath();

  useEffect(() => {
    const { title, description } = documentTexts(pathname, t);

    function apply() {
      if (document.title !== title) {
        document.title = title;
      }
      for (const tag of document.querySelectorAll('meta[name="description"]')) {
        if (tag.getAttribute('content') !== description) {
          tag.setAttribute('content', description);
        }
      }
    }

    apply();
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { childList: true, subtree: true, attributes: true, characterData: true });
    return () => watch.disconnect();
  }, [pathname, t]);

  return null;
}
