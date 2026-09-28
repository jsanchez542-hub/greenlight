import { intervalStats, lastStartedAt } from '../statistics.js';
import type { Detector, Finding } from '../types.js';

function humanise(milliseconds: number): string {
  const minutes = milliseconds / 60000;
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = minutes / 60;
  return hours < 48 ? `${hours.toFixed(1)} h` : `${(hours / 24).toFixed(1)} days`;
}

export const detectSilence: Detector = ({ workflow, executions, now, options }): Finding[] => {
  if (!workflow.active) {
    return [];
  }

  const cadence = intervalStats(executions);
  const latest = lastStartedAt(executions);

  if (cadence === null || latest === null || !cadence.regular) {
    return [];
  }

  const elapsedMs = now.getTime() - latest.getTime();
  const allowedMs = cadence.medianMs * options.silenceFactor;

  if (elapsedMs <= allowedMs) {
    return [];
  }

  return [
    {
      workflowId: workflow.id,
      workflowName: workflow.name,
      detector: 'silence',
      severity: 'critical',
      summary: `Active workflow has not run for ${humanise(elapsedMs)} despite running every ${humanise(cadence.medianMs)}. Its trigger is most likely no longer registered.`,
      evidence: {
        lastRunAt: latest.toISOString(),
        silentFor: humanise(elapsedMs),
        usualInterval: humanise(cadence.medianMs),
      },
    },
  ];
};
