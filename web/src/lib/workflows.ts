import type { Finding, Severity, WorkflowHealth, WorkflowSummary } from 'greenlight';
import { healthStates, severities } from './status';

export type HealthFilter = WorkflowHealth | 'all';

export function countByHealth(workflows: readonly WorkflowSummary[]): Record<WorkflowHealth, number> {
  const counts = Object.fromEntries(healthStates.map((state) => [state, 0])) as Record<
    WorkflowHealth,
    number
  >;
  for (const workflow of workflows) {
    counts[workflow.health] += 1;
  }
  return counts;
}

export function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const counts = Object.fromEntries(severities.map((severity) => [severity, 0])) as Record<
    Severity,
    number
  >;
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }
  return counts;
}

export function filterByHealth(
  workflows: readonly WorkflowSummary[],
  filter: HealthFilter,
): WorkflowSummary[] {
  return filter === 'all' ? [...workflows] : workflows.filter((workflow) => workflow.health === filter);
}

export function countFindingsByWorkflow(findings: readonly Finding[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.workflowId, (counts.get(finding.workflowId) ?? 0) + 1);
  }
  return counts;
}
