'use client';

import { useEffect, type RefObject } from 'react';
import { nextFocusIndex } from './onboarding';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(container: RefObject<HTMLElement | null>, onClose: () => void): void {
  useEffect(() => {
    const dialog = container.current;
    if (dialog === null) {
      return;
    }
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));

    (focusable()[0] ?? dialog).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const current = items.indexOf(document.activeElement as HTMLElement);
      const inside = dialog?.contains(document.activeElement) ?? false;
      const next = nextFocusIndex(inside ? current : -1, items.length, event.shiftKey);
      event.preventDefault();
      items[next]?.focus();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous !== null && previous.isConnected) {
        previous.focus();
      }
    };
  }, [container, onClose]);
}
