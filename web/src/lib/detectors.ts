import type { DetectorName, Severity } from 'greenlight-n8n';

export const detectorSeverity: Record<DetectorName, Severity> = {
  'silent-error': 'critical',
  'duration-drift': 'warning',
  silence: 'critical',
  'frequency-drop': 'warning',
};
