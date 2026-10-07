import type { DetectorName, Severity, WorkflowHealth } from 'greenlight';

export const healthStates: readonly WorkflowHealth[] = ['critical', 'warning', 'healthy', 'no-runs'];
export const severities: readonly Severity[] = ['critical', 'warning'];
export const detectorNames: readonly DetectorName[] = [
  'silent-error',
  'duration-drift',
  'silence',
  'frequency-drop',
];
