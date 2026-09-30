'use client';

import { useRef } from 'react';
import { placeCard, tourActions, tourSteps } from '@/lib/onboarding';
import { useAnchorRect } from '@/lib/use-anchor-rect';
import { useDialogFocus } from '@/lib/use-dialog-focus';
import styles from './Tour.module.css';

const CARD_WIDTH = 360;

interface TourProps {
  step: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onConnect: () => void;
  liveAvailable: boolean;
}

export function Tour({ step, onNext, onBack, onClose, onConnect, liveAvailable }: TourProps) {
  const current = tourSteps[step];
  const card = useRef<HTMLDivElement>(null);
  const rect = useAnchorRect(current?.anchor ?? '');
  useDialogFocus(card, onClose);

  if (current === undefined) {
    return null;
  }

  const viewport = typeof window === 'undefined' ? { width: 1280, height: 800 } : { width: window.innerWidth, height: window.innerHeight };
  const width = Math.min(CARD_WIDTH, viewport.width - 32);
  const placement = placeCard(rect, viewport, width);
  const actions = tourActions(step, liveAvailable);

  return (
    <div className={styles.layer}>
      {rect === null ? (
        <div className={styles.dim} aria-hidden="true" />
      ) : (
        <div
          className={styles.ring}
          aria-hidden="true"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.right - rect.left + 8,
            height: rect.bottom - rect.top + 8,
          }}
        />
      )}
      <div
        ref={card}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        style={{ top: placement.top, left: placement.left, width }}
      >
        <p className={styles.count}>
          {step + 1} of {tourSteps.length}
        </p>
        <h2 id="tour-title" className={styles.title}>
          {current.title}
        </h2>
        <p id="tour-body" className={styles.body}>
          {current.body}
        </p>
        <div className={styles.actions}>
          {actions.skip && (
            <button type="button" className={styles.skip} onClick={onClose}>
              Skip tour
            </button>
          )}
          <span className={styles.spacer} />
          {actions.back && (
            <button type="button" className={styles.secondary} onClick={onBack}>
              Back
            </button>
          )}
          {actions.secondaryDone && (
            <button type="button" className={styles.secondary} onClick={onClose}>
              Done
            </button>
          )}
          {actions.primary === 'next' && (
            <button type="button" className={styles.primary} onClick={onNext}>
              Next
            </button>
          )}
          {actions.primary === 'done' && (
            <button type="button" className={styles.primary} onClick={onClose}>
              Done
            </button>
          )}
          {actions.primary === 'connect' && (
            <button type="button" className={styles.primary} onClick={onConnect}>
              Connect my n8n
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
