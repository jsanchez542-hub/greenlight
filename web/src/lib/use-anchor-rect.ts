'use client';

import { useEffect, useState } from 'react';
import type { Rect } from './onboarding';

const MAX_ATTEMPTS = 40;

function findVisible(anchor: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`);
  for (const element of candidates) {
    const box = element.getBoundingClientRect();
    if (box.width > 8 && box.height > 8) {
      return element;
    }
  }
  return null;
}

export function useAnchorRect(anchor: string): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    let attempts = 0;
    let frame = 0;
    let scrolled = false;

    function measure() {
      const element = findVisible(anchor);
      if (element === null) {
        setRect(null);
        if (attempts < MAX_ATTEMPTS) {
          attempts += 1;
          frame = requestAnimationFrame(measure);
        }
        return;
      }
      if (!scrolled) {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        scrolled = true;
      }
      const box = element.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, right: box.right, bottom: box.bottom });
    }

    function remeasure() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }

    frame = requestAnimationFrame(measure);
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [anchor]);

  return rect;
}
