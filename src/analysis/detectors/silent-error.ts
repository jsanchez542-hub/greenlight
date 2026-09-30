import type { ExecutionDetail, NodeRun } from '../../n8n/types.js';
import type { Detector, Finding } from '../types.js';

function carriesError(runs: NodeRun[]): boolean {
  for (const run of runs) {
    for (const branch of run.data?.main ?? []) {
      for (const item of branch ?? []) {
        if (item.json !== undefined && 'error' in item.json) {
          return true;
        }
      }
    }
  }
  return false;
}

function failingNodes(execution: ExecutionDetail): string[] {
  const runData = execution.data?.resultData?.runData ?? {};
  return Object.entries(runData)
    .filter(([, runs]) => carriesError(runs))
    .map(([nodeName]) => nodeName);
}

export const detectSilentErrors: Detector = ({ workflow, executionDetails }): Finding[] => {
  if (!workflow.active) {
    return [];
  }

  const occurrences = new Map<string, number>();
  let inspected = 0;

  for (const execution of executionDetails) {
    if (execution.status !== 'success') {
      continue;
    }
    inspected += 1;
    for (const nodeName of failingNodes(execution)) {
      occurrences.set(nodeName, (occurrences.get(nodeName) ?? 0) + 1);
    }
  }

  if (occurrences.size === 0) {
    return [];
  }

  const nodes = [...occurrences.entries()].sort((a, b) => b[1] - a[1]);

  return nodes.map(([nodeName, count]) => ({
    workflowId: workflow.id,
    workflowName: workflow.name,
    detector: 'silent-error' as const,
    severity: 'critical' as const,
    summary: `"${nodeName}" emitted an error in ${count} of the last ${inspected} successful executions. The workflow reports success while this step fails.`,
    evidence: {
      node: nodeName,
      executionsWithError: count,
      executionsInspected: inspected,
    },
  }));
};
