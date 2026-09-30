'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SEARCH_INPUT_ID, isTypingTarget, nextShortcutStep } from './shortcuts';

const SEQUENCE_TIMEOUT_MS = 1500;

export function useShortcuts(): void {
  const router = useRouter();

  useEffect(() => {
    let awaitingTarget = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) {
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
        router.push(step.href);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [router]);
}
