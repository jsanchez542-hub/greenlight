export type TourStepId = 'purpose' | 'states' | 'findings' | 'workflows' | 'checks' | 'keys';

export interface TourStep {
  id: TourStepId;
  anchor: string;
}

export const tourSteps: readonly TourStep[] = [
  { id: 'purpose', anchor: 'brand' },
  { id: 'states', anchor: 'states' },
  { id: 'findings', anchor: 'nav-findings' },
  { id: 'workflows', anchor: 'nav-workflows' },
  { id: 'checks', anchor: 'nav-checks' },
  { id: 'keys', anchor: 'shortcuts' },
];

export type OnboardingState =
  | { phase: 'closed' }
  | { phase: 'welcome' }
  | { phase: 'tour'; step: number };

export type OnboardingAction =
  | { type: 'welcome' }
  | { type: 'tour' }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'close' };

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'welcome':
      return { phase: 'welcome' };
    case 'tour':
      return { phase: 'tour', step: 0 };
    case 'next':
      if (state.phase !== 'tour') {
        return state;
      }
      return state.step + 1 < tourSteps.length ? { phase: 'tour', step: state.step + 1 } : { phase: 'closed' };
    case 'back':
      return state.phase === 'tour' ? { phase: 'tour', step: Math.max(0, state.step - 1) } : state;
    case 'close':
      return { phase: 'closed' };
  }
}

export type PrimaryAction = 'next' | 'done' | 'connect';

export interface TourActions {
  skip: boolean;
  back: boolean;
  primary: PrimaryAction;
  secondaryDone: boolean;
}

export function tourActions(step: number, liveAvailable: boolean, total: number = tourSteps.length): TourActions {
  const back = step > 0;
  if (step < total - 1) {
    return { skip: true, back, primary: 'next', secondaryDone: false };
  }
  return { skip: false, back, primary: liveAvailable ? 'done' : 'connect', secondaryDone: !liveAvailable };
}

/**
 * The welcome shows to someone who has not seen it, and stays up until it is dismissed even
 * though showing it is what marks it as seen.
 */
export function visibleState(
  state: OnboardingState,
  welcomeSeen: boolean,
  shownThisVisit = false,
): OnboardingState {
  return state.phase === 'closed' && (!welcomeSeen || shownThisVisit) ? { phase: 'welcome' } : state;
}

export function welcomeChoices(liveAvailable: boolean): { tour: boolean; connect: boolean } {
  return { tour: true, connect: !liveAvailable };
}

export function nextFocusIndex(current: number, count: number, backwards: boolean): number {
  if (count === 0) {
    return -1;
  }
  if (current < 0) {
    return backwards ? count - 1 : 0;
  }
  return (current + (backwards ? count - 1 : 1)) % count;
}

export interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface CardPlacement {
  top: number;
  left: number;
}

const MARGIN = 16;
const GAP = 14;
const ESTIMATED_CARD_HEIGHT = 260;

export function placeCard(anchor: Rect | null, viewport: Viewport, cardWidth: number): CardPlacement {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const maxLeft = Math.max(MARGIN, viewport.width - cardWidth - MARGIN);
  const maxTop = Math.max(MARGIN, viewport.height - ESTIMATED_CARD_HEIGHT - MARGIN);

  if (anchor === null) {
    return {
      left: clamp((viewport.width - cardWidth) / 2, MARGIN, maxLeft),
      top: clamp((viewport.height - ESTIMATED_CARD_HEIGHT) / 2, MARGIN, maxTop),
    };
  }
  if (anchor.right + GAP + cardWidth + MARGIN <= viewport.width) {
    return { left: anchor.right + GAP, top: clamp(anchor.top, MARGIN, maxTop) };
  }
  const below = anchor.bottom + GAP;
  if (below <= maxTop) {
    return { left: clamp(anchor.left, MARGIN, maxLeft), top: below };
  }
  return {
    left: clamp(anchor.left, MARGIN, maxLeft),
    top: clamp(anchor.top - GAP - ESTIMATED_CARD_HEIGHT, MARGIN, maxTop),
  };
}
