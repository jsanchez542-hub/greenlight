'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useReducer, useState } from 'react';
import { onboardingReducer, visibleState, type OnboardingState } from './onboarding';
import { WELCOME_FLAG, WELCOME_SKIPPED_FLAG } from './stored-flag';
import { usePath } from './use-path';
import { useStoredFlag } from './use-stored-flag';

export function useOnboarding() {
  const router = useRouter();
  const pathname = usePath();
  const [welcomeSeen, markWelcomeSeen] = useStoredFlag(WELCOME_FLAG);
  const [, markWelcomeSkipped] = useStoredFlag(WELCOME_SKIPPED_FLAG);
  const [shownThisVisit, setShownThisVisit] = useState(false);
  const [state, dispatch] = useReducer(onboardingReducer, { phase: 'closed' } satisfies OnboardingState);

  const welcomeShown = useCallback(() => {
    markWelcomeSeen();
    setShownThisVisit(true);
  }, [markWelcomeSeen]);

  const startTour = useCallback(() => {
    markWelcomeSeen();
    setShownThisVisit(false);
    if (pathname !== '/') {
      router.push('/');
    }
    dispatch({ type: 'tour' });
  }, [markWelcomeSeen, pathname, router]);

  const close = useCallback(() => {
    markWelcomeSeen();
    setShownThisVisit(false);
    dispatch({ type: 'close' });
  }, [markWelcomeSeen]);

  const skipWelcome = useCallback(() => {
    markWelcomeSkipped();
    close();
  }, [markWelcomeSkipped, close]);

  const next = useCallback(() => dispatch({ type: 'next' }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);

  return {
    state: visibleState(state, welcomeSeen, shownThisVisit),
    welcomeShown,
    startTour,
    close,
    skipWelcome,
    next,
    back,
  };
}
