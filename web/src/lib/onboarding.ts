export interface TourStep {
  id: string;
  anchor: string;
  title: string;
  body: string;
}

export const tourSteps: readonly TourStep[] = [
  {
    id: 'purpose',
    anchor: 'brand',
    title: 'What GreenLight looks for',
    body: 'Some n8n workflows finish green and still fail inside. GreenLight reads your run history and shows which ones.',
  },
  {
    id: 'states',
    anchor: 'states',
    title: 'Four states',
    body: 'Critical and warning come from the checks. Healthy means nothing was found in the history it read, which is not a guarantee. No runs is not a verdict: there was no history to judge.',
  },
  {
    id: 'findings',
    anchor: 'nav-findings',
    title: 'Findings',
    body: 'Each finding names the check, the workflow and the evidence. Open one to see the numbers and what to review.',
  },
  {
    id: 'workflows',
    anchor: 'nav-workflows',
    title: 'Workflows',
    body: 'Every workflow that was checked. Sort any column, filter by state, search by name.',
  },
  {
    id: 'checks',
    anchor: 'nav-checks',
    title: 'Checks',
    body: 'What each check looks for and the defaults it uses to decide.',
  },
  {
    id: 'keys',
    anchor: 'shortcuts',
    title: 'Keyboard',
    body: 'Press g then o, f, w or c to move between sections, / to search workflows and ? to open this tour again.',
  },
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

export function visibleState(state: OnboardingState, welcomeSeen: boolean): OnboardingState {
  return state.phase === 'closed' && !welcomeSeen ? { phase: 'welcome' } : state;
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
