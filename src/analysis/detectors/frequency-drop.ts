import { splitByWindow } from '../statistics.js';
import type { Detector, Finding } from '../types.js';

const HOUR_MS = 60 * 60 * 1000;

function spanHours(timestamps: number[]): number {
  if (timestamps.length < 2) {
    return 0;
  }
  const first = Math.min(...timestamps);
  const last = Math.max(...timestamps);
  return (last - first) / HOUR_MS;
}

export const detectFrequencyDrop: Detector = ({
  workflow,
  runsOnAClock,
  executions,
  now,
  options,
}): Finding[] => {
  if (!workflow.active || !runsOnAClock) {
    return [];
  }

  const { baseline, recent } = splitByWindow(executions, now, options.recentWindowHours);
  if (baseline.length < options.minBaselineSamples) {
    return [];
  }

  const baselineHours = spanHours(baseline.map((execution) => Date.parse(execution.startedAt)));
  if (baselineHours <= 0) {
    return [];
  }

  const baselineRate = baseline.length / baselineHours;
  const recentRate = recent.length / options.recentWindowHours;
  const expected = Math.round(baselineRate * options.recentWindowHours);

  if (recent.length === 0 || recentRate >= baselineRate * options.frequencyDropRatio) {
    return [];
  }

  return [
    {
      workflowId: workflow.id,
      workflowName: workflow.name,
      detector: 'frequency-drop',
      severity: 'warning',
      summary: `Ran ${recent.length} ${recent.length === 1 ? 'time' : 'times'} in the last ${options.recentWindowHours}h where roughly ${expected} were expected. A schedule was probably edited.`,
      evidence: {
        recentRuns: recent.length,
        expectedRuns: expected,
        windowHours: options.recentWindowHours,
        baselineRuns: baseline.length,
      },
    },
  ];
};
