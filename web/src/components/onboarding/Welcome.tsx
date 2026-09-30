'use client';

import { useRef } from 'react';
import { welcomeChoices } from '@/lib/onboarding';
import { useDialogFocus } from '@/lib/use-dialog-focus';
import { Logo } from '../shell/Logo';
import styles from './Welcome.module.css';

interface WelcomeProps {
  liveAvailable: boolean;
  onTour: () => void;
  onConnect: () => void;
  onClose: () => void;
}

export function Welcome({ liveAvailable, onTour, onConnect, onClose }: WelcomeProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const choices = welcomeChoices(liveAvailable);
  useDialogFocus(dialog, onClose);

  return (
    <div className={styles.layer}>
      <div
        ref={dialog}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-body"
        tabIndex={-1}
      >
        <Logo size={44} />
        <h2 id="welcome-title" className={styles.title}>
          Welcome to GreenLight
        </h2>
        <p id="welcome-body" className={styles.body}>
          Some n8n workflows finish green and still fail inside. GreenLight reads your run history and shows which ones.
          {choices.connect
            ? ' Take a one-minute tour, or connect your own n8n first.'
            : ' Take a one-minute tour of what is on screen.'}
        </p>
        <div className={styles.actions}>
          {choices.tour && (
            <button type="button" className={styles.primary} onClick={onTour}>
              Take the 1-minute tour
            </button>
          )}
          {choices.connect && (
            <button type="button" className={styles.secondary} onClick={onConnect}>
              Connect my n8n
            </button>
          )}
        </div>
        <button type="button" className={styles.skip} onClick={onClose}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
