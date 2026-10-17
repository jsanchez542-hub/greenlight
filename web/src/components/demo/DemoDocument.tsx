'use client';

import { useEffect } from 'react';
import { useLang, useMessages } from '@/i18n/context';
import { demoDocument, fullTitle } from '@/lib/demo-titles';
import { sampleResult } from '@/lib/sample';
import { usePath } from '@/lib/use-path';

/** The pages are built in English; this gives the title and the description of the page in the language of the visitor. */
export function DemoDocument() {
  const t = useMessages();
  const lang = useLang();
  const pathname = usePath();

  useEffect(() => {
    const texts = demoDocument(pathname, sampleResult, t, lang);
    const title = fullTitle(texts, t);

    function apply() {
      if (document.title !== title) {
        document.title = title;
      }
      for (const tag of document.querySelectorAll('meta[name="description"]')) {
        if (tag.getAttribute('content') !== texts.description) {
          tag.setAttribute('content', texts.description);
        }
      }
    }

    apply();
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { childList: true, subtree: true, attributes: true, characterData: true });
    return () => watch.disconnect();
  }, [pathname, t, lang]);

  return null;
}
