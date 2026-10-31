import { analyseWorkflow } from './analysis/analyse.js';
import { lastStartedAt } from './analysis/statistics.js';
import { defaultAnalysisOptions, type AnalysisOptions, type Finding } from './analysis/types.js';
import { runsOnAClock } from './analysis/trigger.js';
import { MAX_CONCURRENCY, isValidConcurrency, mapWithLimit } from './concurrency.js';
import type { N8nClient } from './n8n/client.js';
import type { Execution, ExecutionDetail, Workflow } from './n8n/types.js';

export const SCAN_RESULT_VERSION = 1;

export interface ScanOptions {
  executionLimit: number;
  detailSampleSize: number;
  /**
   * How many workflows are read at the same time, from 1 to `MAX_CONCURRENCY`. Left out it is 1,
   * which reads them one after another as version 1.0 did. The result is the same for any value.
   */
  concurrency?: number;
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

interface WorkflowScan {
  summary: WorkflowSummary;
  findings: Finding[];
}

/** Reads one workflow and judges it. Its requests go out one after another. */
async function scanWorkflow(
  client: N8nClient,
  workflow: Workflow,
  options: ScanOptions,
  now: Date,
): Promise<WorkflowScan> {
  const detail = await client.getWorkflow(workflow.id);
  const onAClock = runsOnAClock(detail.nodes);
  const executions = await client.listExecutions({
    workflowId: workflow.id,
    limit: options.executionLimit,
  });

  const findings: Finding[] = [];
  if (executions.length > 0) {
    const executionDetails: ExecutionDetail[] = [];
    for (const execution of recentSuccesses(executions, options.detailSampleSize)) {
      executionDetails.push(await client.getExecution(execution.id));
    }

    findings.push(
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

  return {
    findings,
    summary: {
      id: workflow.id,
      name: workflow.name,
      active: workflow.active,
      trigger: onAClock ? 'schedule' : 'event',
      executionsRead: executions.length,
      lastStartedAt: lastStartedAt(executions)?.toISOString() ?? null,
      health: healthOf(executions, findings),
    },
  };
}

export async function scan(client: N8nClient, options: ScanOptions): Promise<ScanResult> {
  const concurrency = options.concurrency ?? 1;
  if (!isValidConcurrency(concurrency)) {
    throw new RangeError(
      `concurrency must be a whole number from 1 to ${MAX_CONCURRENCY}, received ${String(concurrency)}.`,
    );
  }

  const now = options.now ?? new Date();
  const workflows = await client.listWorkflows();
  // The results come back in the order of the list, so the output does not depend on which
  // workflow finished first.
  const scanned = await mapWithLimit(workflows, concurrency, (workflow) =>
    scanWorkflow(client, workflow, options, now),
  );
  const summaries = scanned.map(({ summary }) => summary);
  const findings = scanned.flatMap((entry) => entry.findings);

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
