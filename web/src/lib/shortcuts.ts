import { sections } from './navigation';

export const SEARCH_INPUT_ID = 'workflow-search';
export const SEQUENCE_PREFIX = 'g';

export interface ShortcutStep {
  awaitingTarget: boolean;
  href?: string;
}

export function nextShortcutStep(awaitingTarget: boolean, key: string): ShortcutStep {
  if (!awaitingTarget) {
    return { awaitingTarget: key === SEQUENCE_PREFIX };
  }
  const section = sections.find((candidate) => candidate.shortcut === key);
  return section === undefined
    ? { awaitingTarget: key === SEQUENCE_PREFIX }
    : { awaitingTarget: false, href: section.href };
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
