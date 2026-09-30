import type { WorkflowHealth } from 'greenlight';
import type { ReactNode } from 'react';
import styles from './StatusIcon.module.css';

const shapes: Record<WorkflowHealth, ReactNode> = {
  critical: (
    <>
      <path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" fill="currentColor" />
      <path d="M8 4.75v4M8 10.5v.01" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  warning: (
    <>
      <path d="M8 1.75 14.75 13.5H1.25Z" fill="currentColor" strokeLinejoin="round" stroke="currentColor" />
      <path d="M8 6.25v3.5M8 11.5v.01" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  healthy: (
    <>
      <circle cx="8" cy="8" r="6.5" fill="currentColor" />
      <path d="m5 8.2 2.1 2.1L11 6.3" fill="none" stroke="var(--surface)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'no-runs': (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 2" />
      <path d="M5.5 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
};

export function StatusIcon({ state }: { state: WorkflowHealth }) {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {shapes[state]}
    </svg>
  );
}

export function StatusLabel({ state, label }: { state: WorkflowHealth; label: string }) {
  return (
    <span className={styles.label} data-state={state}>
      <StatusIcon state={state} />
      {label}
    </span>
  );
}
