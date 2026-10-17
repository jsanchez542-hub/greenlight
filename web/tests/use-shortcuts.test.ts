// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEARCH_INPUT_ID } from '@/lib/shortcuts';
import { useShortcuts } from '@/lib/use-shortcuts';

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Shell({ onHelp }: { onHelp: () => void }) {
  useShortcuts(onHelp);
  return null;
}

let host: HTMLDivElement;
let root: Root;

function show(onHelp: () => void) {
  act(() => root.render(createElement(Shell, { onHelp })));
}

function press(key: string, target: EventTarget = window) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  router.push.mockClear();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('useShortcuts', () => {
  it('goes to a section with g then its key', () => {
    show(() => undefined);
    press('g');
    press('w');
    expect(router.push).toHaveBeenCalledWith('/workflows');
  });

  it('keeps a pending g when the page changes between the two keys', () => {
    show(() => undefined);
    press('g');
    show(() => undefined);
    press('w');
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/workflows');
  });

  it('opens the help that belongs to the current page', () => {
    const before = vi.fn();
    const after = vi.fn();
    show(before);
    show(after);
    press('?');
    expect(before).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('forgets a g that is not followed by a key soon enough', () => {
    vi.useFakeTimers();
    show(() => undefined);
    press('g');
    act(() => vi.advanceTimersByTime(1600));
    press('w');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('leaves alone keys typed into a field and keys pressed while a dialog is open', () => {
    show(() => undefined);
    const field = document.createElement('input');
    document.body.append(field);
    press('g', field);
    press('w', field);
    expect(router.push).not.toHaveBeenCalled();

    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    document.body.append(dialog);
    press('g');
    press('w');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('moves to the search of the workflows with a slash', () => {
    show(() => undefined);
    const search = document.createElement('input');
    search.id = SEARCH_INPUT_ID;
    document.body.append(search);
    press('/');
    expect(document.activeElement).toBe(search);
  });

  it('stops listening when the shell goes away', () => {
    show(() => undefined);
    act(() => root.unmount());
    root = createRoot(host);
    press('g');
    press('w');
    expect(router.push).not.toHaveBeenCalled();
  });
});
