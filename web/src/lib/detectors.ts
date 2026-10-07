import type { DetectorName, Severity } from 'greenlight';

export const detectorSeverity: Record<DetectorName, Severity> = {
  'silent-error': 'critical',
  'duration-drift': 'warning',
  silence: 'critical',
  'frequency-drop': 'warning',
};
