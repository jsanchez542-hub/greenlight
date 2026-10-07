'use client';

import { useRouter } from 'next/navigation';
import { useLang, useMessages } from '@/i18n/context';
import type { Lang } from '@/i18n';
import { browserSources } from '@/lib/browser-sources';
import { setLanguage } from '@/lib/stored-flag';
import styles from './LanguageSwitch.module.css';

const ORDER: readonly Lang[] = ['es', 'en'];

export function LanguageSwitch({ placement }: { placement: 'sidebar' | 'top' }) {
  const lang = useLang();
  const t = useMessages();
  const router = useRouter();

  function choose(next: Lang) {
    if (next === lang) {
      return;
    }
    setLanguage(next, browserSources());
    router.refresh();
  }

  return (
    <div className={styles.group} data-placement={placement} role="group" aria-label={t.language.group}>
      {ORDER.map((code) => {
        const name = code === 'es' ? t.language.spanish : t.language.english;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={code === lang}
            aria-label={name}
            title={name}
            onClick={() => choose(code)}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
