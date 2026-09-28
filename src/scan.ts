import { analyseWorkflow } from './analysis/analyse.js';
import { defaultAnalysisOptions, type AnalysisOptions, type Finding } from './analysis/types.js';
import { runsOnAClock } from './analysis/trigger.js';
import type { N8nClient } from './n8n/client.js';
import type { Execution, ExecutionDetail } from './n8n/types.js';

export interface ScanOptions {
  executionLimit: number;
  detailSampleSize: number;
  analysis?: AnalysisOptions;
  now?: Date;
}

export interface ScanResult {
  scannedAt: string;
  workflowsScanned: number;
  findings: Finding[];
}

function recentSuccesses(executions: Execution[], sampleSize: number): Execution[] {
  return executions
    .filter((execution) => execution.status === 'success')
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, sampleSize);
}

export async function scan(client: N8nClient, options: ScanOptions): Promise<ScanResult> {
  const now = options.now ?? new Date();
  const workflows = await client.listWorkflows();
  const findings: Finding[] = [];

  for (const workflow of workflows) {
    const executions = await client.listExecutions({
      workflowId: workflow.id,
      limit: options.executionLimit,
    });

    if (executions.length === 0) {
      continue;
    }

    const executionDetails: ExecutionDetail[] = [];
    for (const execution of recentSuccesses(executions, options.detailSampleSize)) {
      executionDetails.push(await client.getExecution(execution.id));
    }

    const detail = await client.getWorkflow(workflow.id);

    findings.push(
      ...analyseWorkflow({
        workflow,
        runsOnAClock: runsOnAClock(detail.nodes),
        executions,
        executionDetails,
        now,
        options: options.analysis ?? defaultAnalysisOptions,
      }),
    );
  }

  return {
    scannedAt: now.toISOString(),
    workflowsScanned: workflows.length,
    findings,
  };
}
