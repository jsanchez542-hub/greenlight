'use client';

import { useEffect, useState } from 'react';
import styles from './CopyButton.module.css';

type CopyState = 'idle' | 'copied' | 'failed';

const RESET_MS = 2_000;

interface CopyButtonProps {
  text: string;
  label: string;
}

export function CopyButton({ text, label }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') {
      return;
    }
    const timer = setTimeout(() => setState('idle'), RESET_MS);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <button type="button" className={styles.button} onClick={copy} aria-label={`Copy ${label}`}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : 'Copy'}
      <span className="visually-hidden" role="status">
        {state === 'copied' ? `${label} copied` : ''}
      </span>
    </button>
  );
}
