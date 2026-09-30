import { describe, expect, it } from 'vitest';
import { activeSection, sections } from '@/lib/navigation';
import { decodeSegment, findingHref, workflowHref } from '@/lib/routes';
import { nextShortcutStep } from '@/lib/shortcuts';
import {
  SIDEBAR_STORAGE_KEY,
  parseSidebarState,
  readSidebarState,
  toggledSidebar,
  writeSidebarState,
} from '@/lib/sidebar';

describe('activeSection', () => {
  it('matches the root only for the overview', () => {
    expect(activeSection('/')?.id).toBe('overview');
  });

  it('matches a section and everything below it', () => {
    expect(activeSection('/findings')?.id).toBe('findings');
    expect(activeSection('/workflows/inventory')?.id).toBe('workflows');
    expect(activeSection('/checks')?.id).toBe('checks');
  });

  it('does not match a path that only starts with the same letters', () => {
    expect(activeSection('/findingsx')).toBeUndefined();
  });

  it('has a distinct shortcut for every section', () => {
    expect(new Set(sections.map((section) => section.shortcut)).size).toBe(sections.length);
  });
});

describe('nextShortcutStep', () => {
  it('waits for a target after the prefix key', () => {
    expect(nextShortcutStep(false, 'g')).toEqual({ awaitingTarget: true });
  });

  it('ignores other keys when nothing is pending', () => {
    expect(nextShortcutStep(false, 'f')).toEqual({ awaitingTarget: false });
  });

  it('goes to the section named by the second key', () => {
    expect(nextShortcutStep(true, 'w')).toEqual({ awaitingTarget: false, href: '/workflows' });
    expect(nextShortcutStep(true, 'o')).toEqual({ awaitingTarget: false, href: '/' });
  });

  it('drops the pending prefix on an unknown key', () => {
    expect(nextShortcutStep(true, 'x')).toEqual({ awaitingTarget: false });
  });

  it('keeps waiting when the prefix is pressed twice', () => {
    expect(nextShortcutStep(true, 'g')).toEqual({ awaitingTarget: true });
  });
});

describe('the sidebar state', () => {
  it('defaults to expanded for anything that is not collapsed', () => {
    expect(parseSidebarState(null)).toBe('expanded');
    expect(parseSidebarState('wide')).toBe('expanded');
    expect(parseSidebarState('collapsed')).toBe('collapsed');
  });

  it('toggles between the two states', () => {
    expect(toggledSidebar('expanded')).toBe('collapsed');
    expect(toggledSidebar('collapsed')).toBe('expanded');
  });

  it('reads and writes through storage', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
    writeSidebarState(storage, 'collapsed');
    expect(data.get(SIDEBAR_STORAGE_KEY)).toBe('collapsed');
    expect(readSidebarState(storage)).toBe('collapsed');
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readSidebarState(broken)).toBe('expanded');
    expect(() => writeSidebarState(broken, 'collapsed')).not.toThrow();
  });

  it('works without any storage', () => {
    expect(readSidebarState(undefined)).toBe('expanded');
    expect(() => writeSidebarState(undefined, 'collapsed')).not.toThrow();
  });
});

describe('routes', () => {
  it('escapes identifiers placed in a path', () => {
    expect(workflowHref('a b/c')).toBe('/workflows/a%20b%2Fc');
    expect(findingHref('orders:silent-error:0')).toBe('/findings/orders%3Asilent-error%3A0');
  });

  it('decodes a segment back to what was encoded', () => {
    expect(decodeSegment(encodeURIComponent('a b/c:d'))).toBe('a b/c:d');
  });

  it('returns a malformed segment unchanged', () => {
    expect(decodeSegment('100%')).toBe('100%');
  });
});
