import type { DetectorName, Severity, WorkflowHealth } from 'greenlight';

export const healthStates: readonly WorkflowHealth[] = ['critical', 'warning', 'healthy', 'no-runs'];
export const severities: readonly Severity[] = ['critical', 'warning'];
export const detectorNames: readonly DetectorName[] = [
  'silent-error',
  'duration-drift',
  'silence',
  'frequency-drop',
];

export const healthLabel: Record<WorkflowHealth, string> = {
  critical: 'Critical',
  warning: 'Warning',
  healthy: 'Healthy',
  'no-runs': 'No runs',
};

export const healthMeaning: Record<WorkflowHealth, string> = {
  critical: 'At least one check raised a critical finding.',
  warning: 'At least one check raised a warning and none raised a critical finding.',
  healthy: 'History was read and no check found anything. This is not a guarantee.',
  'no-runs': 'The instance holds no execution history for it, so nothing could be judged.',
};

export const severityLabel: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
};

export const triggerLabel = {
  schedule: 'Schedule',
  event: 'Event',
} as const;

export const triggerMeaning = {
  schedule: 'Started by a clock',
  event: 'Started by anything else, such as a webhook or a polling trigger',
} as const;
