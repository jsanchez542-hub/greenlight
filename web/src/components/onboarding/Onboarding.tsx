'use client';

import { useRouter } from 'next/navigation';
import type { OnboardingState } from '@/lib/onboarding';
import { SETUP_HREF } from '@/lib/navigation';
import { Tour } from './Tour';
import { Welcome } from './Welcome';

interface OnboardingProps {
  state: OnboardingState;
  liveAvailable: boolean;
  onStartTour: () => void;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onSkipWelcome: () => void;
  onWelcomeShown: () => void;
}

export function Onboarding({
  state,
  liveAvailable,
  onStartTour,
  onNext,
  onBack,
  onClose,
  onSkipWelcome,
  onWelcomeShown,
}: OnboardingProps) {
  const router = useRouter();

  if (state.phase === 'welcome') {
    return (
      <Welcome
        liveAvailable={liveAvailable}
        onTour={onStartTour}
        onConnect={() => {
          onClose();
          router.push(SETUP_HREF);
        }}
        onClose={onSkipWelcome}
        onShown={onWelcomeShown}
      />
    );
  }
  if (state.phase === 'tour') {
    return (
      <Tour
        step={state.step}
        liveAvailable={liveAvailable}
        onNext={onNext}
        onBack={onBack}
        onClose={onClose}
        onConnect={() => {
          onClose();
          router.push(SETUP_HREF);
        }}
      />
    );
  }
  return null;
}
