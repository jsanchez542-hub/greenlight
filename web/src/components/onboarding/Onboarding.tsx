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
}

export function Onboarding({ state, liveAvailable, onStartTour, onNext, onBack, onClose }: OnboardingProps) {
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
        onClose={onClose}
      />
    );
  }
  if (state.phase === 'tour') {
    return <Tour step={state.step} onNext={onNext} onBack={onBack} onClose={onClose} />;
  }
  return null;
}
