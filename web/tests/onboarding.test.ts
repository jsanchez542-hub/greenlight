import { describe, expect, it } from 'vitest';
import {
  nextFocusIndex,
  onboardingReducer,
  placeCard,
  tourSteps,
  visibleState,
  welcomeChoices,
  type OnboardingState,
} from '@/lib/onboarding';
import { WELCOME_FLAG, WATCH_TIP_FLAG, readFlag, writeFlag } from '@/lib/stored-flag';

const closed: OnboardingState = { phase: 'closed' };

describe('onboardingReducer', () => {
  it('opens the tour at its first step', () => {
    expect(onboardingReducer(closed, { type: 'tour' })).toEqual({ phase: 'tour', step: 0 });
  });

  it('moves forward and back through the steps', () => {
    const second = onboardingReducer({ phase: 'tour', step: 0 }, { type: 'next' });
    expect(second).toEqual({ phase: 'tour', step: 1 });
    expect(onboardingReducer(second, { type: 'back' })).toEqual({ phase: 'tour', step: 0 });
  });

  it('stays on the first step when going back from it', () => {
    expect(onboardingReducer({ phase: 'tour', step: 0 }, { type: 'back' })).toEqual({ phase: 'tour', step: 0 });
  });

  it('closes after the last step', () => {
    const last: OnboardingState = { phase: 'tour', step: tourSteps.length - 1 };
    expect(onboardingReducer(last, { type: 'next' })).toEqual(closed);
  });

  it('can be closed from anywhere', () => {
    expect(onboardingReducer({ phase: 'tour', step: 3 }, { type: 'close' })).toEqual(closed);
    expect(onboardingReducer({ phase: 'welcome' }, { type: 'close' })).toEqual(closed);
  });

  it('ignores next and back outside the tour', () => {
    expect(onboardingReducer(closed, { type: 'next' })).toEqual(closed);
    expect(onboardingReducer({ phase: 'welcome' }, { type: 'back' })).toEqual({ phase: 'welcome' });
  });
});

describe('visibleState', () => {
  it('shows the welcome to someone who has not seen it', () => {
    expect(visibleState(closed, false)).toEqual({ phase: 'welcome' });
  });

  it('shows nothing once the welcome has been seen', () => {
    expect(visibleState(closed, true)).toEqual(closed);
  });

  it('never replaces a tour that is running', () => {
    const running: OnboardingState = { phase: 'tour', step: 2 };
    expect(visibleState(running, false)).toEqual(running);
  });
});

describe('welcomeChoices', () => {
  it('offers both paths until an instance is connected', () => {
    expect(welcomeChoices(false)).toEqual({ tour: true, connect: true });
  });

  it('offers only the tour once connected', () => {
    expect(welcomeChoices(true)).toEqual({ tour: true, connect: false });
  });
});

describe('the tour content', () => {
  it('has unique steps with short text and an anchor each', () => {
    expect(new Set(tourSteps.map((step) => step.id)).size).toBe(tourSteps.length);
    for (const step of tourSteps) {
      expect(step.anchor).not.toBe('');
      expect(step.body.length).toBeLessThan(260);
    }
  });

  it('never uses a long dash', () => {
    for (const step of tourSteps) {
      expect(`${step.title}${step.body}`).not.toMatch(/[—–]/);
    }
  });
});

describe('nextFocusIndex', () => {
  it('cycles forward and wraps', () => {
    expect(nextFocusIndex(0, 3, false)).toBe(1);
    expect(nextFocusIndex(2, 3, false)).toBe(0);
  });

  it('cycles backward and wraps', () => {
    expect(nextFocusIndex(1, 3, true)).toBe(0);
    expect(nextFocusIndex(0, 3, true)).toBe(2);
  });

  it('enters the dialog from outside at the matching end', () => {
    expect(nextFocusIndex(-1, 3, false)).toBe(0);
    expect(nextFocusIndex(-1, 3, true)).toBe(2);
  });

  it('has nothing to focus in an empty dialog', () => {
    expect(nextFocusIndex(-1, 0, false)).toBe(-1);
  });
});

describe('placeCard', () => {
  const viewport = { width: 1280, height: 800 };

  it('centres the card when there is nothing to point at', () => {
    const placement = placeCard(null, viewport, 360);
    expect(placement.left).toBe((1280 - 360) / 2);
  });

  it('puts the card beside an anchor on the left edge', () => {
    const anchor = { top: 120, left: 10, right: 230, bottom: 160 };
    expect(placeCard(anchor, viewport, 360)).toEqual({ left: 244, top: 120 });
  });

  it('puts the card below an anchor that leaves no room on the right', () => {
    const anchor = { top: 100, left: 900, right: 1260, bottom: 140 };
    const placement = placeCard(anchor, viewport, 360);
    expect(placement.top).toBe(154);
    expect(placement.left).toBeLessThanOrEqual(1280 - 360 - 16);
  });

  it('puts the card above an anchor near the bottom of the screen', () => {
    const anchor = { top: 760, left: 900, right: 1260, bottom: 790 };
    expect(placeCard(anchor, viewport, 360).top).toBeLessThan(760);
  });

  it('keeps the card inside a narrow screen', () => {
    const placement = placeCard({ top: 700, left: 300, right: 380, bottom: 740 }, { width: 390, height: 844 }, 340);
    expect(placement.left).toBeGreaterThanOrEqual(16);
    expect(placement.left + 340).toBeLessThanOrEqual(390 - 16 + 0.001);
  });
});

describe('stored flags', () => {
  it('versions the keys so a changed tour can be shown again', () => {
    expect(WELCOME_FLAG).toMatch(/\.v\d+$/);
    expect(WATCH_TIP_FLAG).toMatch(/\.v\d+$/);
  });

  it('reads back what was written', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
    expect(readFlag(storage, WELCOME_FLAG)).toBe(false);
    writeFlag(storage, WELCOME_FLAG);
    expect(readFlag(storage, WELCOME_FLAG)).toBe(true);
    expect(readFlag(storage, WATCH_TIP_FLAG)).toBe(false);
  });

  it('treats blocked storage as not seen and does not throw on write', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readFlag(blocked, WELCOME_FLAG)).toBe(false);
    expect(() => writeFlag(blocked, WELCOME_FLAG)).not.toThrow();
    expect(readFlag(undefined, WELCOME_FLAG)).toBe(false);
    expect(() => writeFlag(undefined, WELCOME_FLAG)).not.toThrow();
  });
});
