'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/i18n/context';
import { STATIC_DEMO } from '@/lib/demo';
import { welcomeChoices } from '@/lib/onboarding';
import { useDialogFocus } from '@/lib/use-dialog-focus';
import { Logo } from '../shell/Logo';
import styles from './Welcome.module.css';

interface WelcomeProps {
  liveAvailable: boolean;
  onTour: () => void;
  onConnect: () => void;
  onClose: () => void;
  onShown: () => void;
}

export function Welcome({ liveAvailable, onTour, onConnect, onClose, onShown }: WelcomeProps) {
  const t = useMessages();
  const dialog = useRef<HTMLDivElement>(null);
  const choices = welcomeChoices(liveAvailable);
  useDialogFocus(dialog, onClose);

  useEffect(() => {
    onShown();
  }, [onShown]);

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
          {t.tour.welcomeTitle}
        </h2>
        <p id="welcome-body" className={styles.body}>
          {t.tour.welcomeBody}
          {choices.connect ? (STATIC_DEMO ? t.demo.welcome : t.tour.welcomeWithConnect) : t.tour.welcomeTourOnly}
        </p>
        <div className={styles.actions}>
          {choices.tour && (
            <button type="button" className={styles.primary} onClick={onTour}>
              {t.tour.startTour}
            </button>
          )}
          {choices.connect && (
            <button type="button" className={styles.secondary} onClick={onConnect}>
              {STATIC_DEMO ? t.demo.welcomeInstall : t.tour.connect}
            </button>
          )}
        </div>
        <button type="button" className={styles.skip} onClick={onClose}>
          {t.tour.skipWelcome}
        </button>
      </div>
    </div>
  );
}
