'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';
import { SEARCH_INPUT_ID, isTypingTarget, nextShortcutStep } from './shortcuts';

const SEQUENCE_TIMEOUT_MS = 1500;

/**
 * The listener is bound once for the life of the shell. A sequence such as g then w has to
 * survive a navigation that lands between the two keys, so nothing the listener holds may be
 * thrown away when the page changes; it reaches the latest help and router through effect events.
 */
export function useShortcuts(onHelp: () => void): void {
  const router = useRouter();
  const help = useEffectEvent(() => onHelp());
  const go = useEffectEvent((href: string) => router.push(href));

  useEffect(() => {
    let awaitingTarget = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function onKeyDown(event: KeyboardEvent) {
      const dialogOpen = document.querySelector('[aria-modal="true"]') !== null;
      if (event.ctrlKey || event.metaKey || event.altKey || dialogOpen || isTypingTarget(event.target)) {
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        help();
        return;
      }
      if (event.key === '/') {
        const search = document.getElementById(SEARCH_INPUT_ID);
        if (search !== null) {
          event.preventDefault();
          search.focus();
        }
        return;
      }

      const step = nextShortcutStep(awaitingTarget, event.key);
      awaitingTarget = step.awaitingTarget;
      clearTimeout(timer);
      if (awaitingTarget) {
        timer = setTimeout(() => {
          awaitingTarget = false;
        }, SEQUENCE_TIMEOUT_MS);
      }
      if (step.href !== undefined) {
        go(step.href);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, []);
}
