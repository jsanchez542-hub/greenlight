import { detectDurationDrift } from './detectors/duration-drift.js';
import { detectFrequencyDrop } from './detectors/frequency-drop.js';
import { detectSilence } from './detectors/silence.js';
import { detectSilentErrors } from './detectors/silent-error.js';
import type { DetectorInput, Finding } from './types.js';

const severityRank: Record<Finding['severity'], number> = {
  critical: 0,
  warning: 1,
};

export function analyseWorkflow(input: DetectorInput): Finding[] {
  const findings = [
    ...detectSilentErrors(input),
    ...detectSilence(input),
    ...detectDurationDrift(input),
  ];

  const alreadySilent = findings.some((finding) => finding.detector === 'silence');
  if (!alreadySilent) {
    findings.push(...detectFrequencyDrop(input));
  }

  return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
