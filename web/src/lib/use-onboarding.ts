'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useReducer } from 'react';
import { onboardingReducer, visibleState, type OnboardingState } from './onboarding';
import { WELCOME_FLAG } from './stored-flag';
import { useStoredFlag } from './use-stored-flag';

export function useOnboarding() {
  const router = useRouter();
  const pathname = usePathname();
  const [welcomeSeen, markWelcomeSeen] = useStoredFlag(WELCOME_FLAG);
  const [state, dispatch] = useReducer(onboardingReducer, { phase: 'closed' } satisfies OnboardingState);

  const startTour = useCallback(() => {
    markWelcomeSeen();
    if (pathname !== '/') {
      router.push('/');
    }
    dispatch({ type: 'tour' });
  }, [markWelcomeSeen, pathname, router]);

  const close = useCallback(() => {
    markWelcomeSeen();
    dispatch({ type: 'close' });
  }, [markWelcomeSeen]);

  const next = useCallback(() => dispatch({ type: 'next' }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);

  return { state: visibleState(state, welcomeSeen), startTour, close, next, back };
}
