import { durationStats, splitByWindow } from '../statistics.js';
import type { Detector, Finding } from '../types.js';

function seconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

export const detectDurationDrift: Detector = ({
  workflow,
  executions,
  now,
  options,
}): Finding[] => {
  const { baseline, recent } = splitByWindow(executions, now, options.recentWindowHours);
  const before = durationStats(baseline);
  const after = durationStats(recent);

  if (before === null || after === null) {
    return [];
  }
  if (before.count < options.minBaselineSamples || after.count < options.minRecentSamples) {
    return [];
  }

  const exceedsUsualSpread = after.medianMs > before.p95Ms;
  const exceedsFactor = after.medianMs >= before.medianMs * options.durationDriftFactor;

  if (!exceedsUsualSpread || !exceedsFactor) {
    return [];
  }

  const ratio = after.medianMs / before.medianMs;

  return [
    {
      workflowId: workflow.id,
      workflowName: workflow.name,
      detector: 'duration-drift',
      severity: 'warning',
      summary: `Typical run time rose from ${seconds(before.medianMs)} to ${seconds(after.medianMs)}, ${ratio.toFixed(1)} times slower than before, which usually means a downstream service is retrying before it gives up.`,
      evidence: {
        baselineMedian: seconds(before.medianMs),
        baselineP95: seconds(before.p95Ms),
        recentMedian: seconds(after.medianMs),
        baselineSamples: before.count,
        recentSamples: after.count,
      },
    },
  ];
};
