import { analyseWorkflow } from './analysis/analyse.js';
import { lastStartedAt } from './analysis/statistics.js';
import { defaultAnalysisOptions, type AnalysisOptions, type Finding } from './analysis/types.js';
import { runsOnAClock } from './analysis/trigger.js';
import type { N8nClient } from './n8n/client.js';
import type { Execution, ExecutionDetail } from './n8n/types.js';

export const SCAN_RESULT_VERSION = 1;

export interface ScanOptions {
  executionLimit: number;
  detailSampleSize: number;
  analysis?: AnalysisOptions;
  now?: Date;
}

/**
 * `no-runs` means the instance holds no execution history for the workflow, so nothing
 * could be judged. `healthy` means history was read and no check raised a finding.
 */
export type WorkflowHealth = 'critical' | 'warning' | 'healthy' | 'no-runs';

export interface WorkflowSummary {
  id: string;
  name: string;
  active: boolean;
  trigger: 'schedule' | 'event';
  executionsRead: number;
  lastStartedAt: string | null;
  health: WorkflowHealth;
}

export interface ScanResult {
  version: typeof SCAN_RESULT_VERSION;
  scannedAt: string;
  workflowsScanned: number;
  workflows: WorkflowSummary[];
  findings: Finding[];
}

const healthOrder: Record<WorkflowHealth, number> = {
  critical: 0,
  warning: 1,
  healthy: 2,
  'no-runs': 3,
};

function recentSuccesses(executions: Execution[], sampleSize: number): Execution[] {
  return executions
    .filter((execution) => execution.status === 'success')
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, sampleSize);
}

function healthOf(executions: Execution[], findings: Finding[]): WorkflowHealth {
  if (executions.length === 0) {
    return 'no-runs';
  }
  if (findings.some((finding) => finding.severity === 'critical')) {
    return 'critical';
  }
  return findings.length > 0 ? 'warning' : 'healthy';
}

export async function scan(client: N8nClient, options: ScanOptions): Promise<ScanResult> {
  const now = options.now ?? new Date();
  const workflows = await client.listWorkflows();
  const summaries: WorkflowSummary[] = [];
  const findings: Finding[] = [];

  for (const workflow of workflows) {
    const detail = await client.getWorkflow(workflow.id);
    const onAClock = runsOnAClock(detail.nodes);
    const executions = await client.listExecutions({
      workflowId: workflow.id,
      limit: options.executionLimit,
    });

    const workflowFindings: Finding[] = [];
    if (executions.length > 0) {
      const executionDetails: ExecutionDetail[] = [];
      for (const execution of recentSuccesses(executions, options.detailSampleSize)) {
        executionDetails.push(await client.getExecution(execution.id));
      }

      workflowFindings.push(
        ...analyseWorkflow({
          workflow,
          runsOnAClock: onAClock,
          executions,
          executionDetails,
          now,
          options: options.analysis ?? defaultAnalysisOptions,
        }),
      );
    }

    findings.push(...workflowFindings);
    summaries.push({
      id: workflow.id,
      name: workflow.name,
      active: workflow.active,
      trigger: onAClock ? 'schedule' : 'event',
      executionsRead: executions.length,
      lastStartedAt: lastStartedAt(executions)?.toISOString() ?? null,
      health: healthOf(executions, workflowFindings),
    });
  }

  summaries.sort(
    (a, b) => healthOrder[a.health] - healthOrder[b.health] || a.name.localeCompare(b.name),
  );
  findings.sort((a, b) => healthOrder[a.severity] - healthOrder[b.severity]);

  return {
    version: SCAN_RESULT_VERSION,
    scannedAt: now.toISOString(),
    workflowsScanned: workflows.length,
    workflows: summaries,
    findings,
  };
}
