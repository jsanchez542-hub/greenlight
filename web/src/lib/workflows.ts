import type { Finding, Severity, WorkflowHealth, WorkflowSummary } from 'greenlight';
import { healthStates, severities } from './status';

export type HealthFilter = WorkflowHealth | 'all';

export interface WorkflowFindings {
  count: number;
  firstIndex: number;
}

export function findingAnchor(index: number): string {
  return `finding-${index}`;
}

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

export function findingsByWorkflow(findings: readonly Finding[]): Map<string, WorkflowFindings> {
  const grouped = new Map<string, WorkflowFindings>();
  findings.forEach((finding, index) => {
    const entry = grouped.get(finding.workflowId);
    if (entry === undefined) {
      grouped.set(finding.workflowId, { count: 1, firstIndex: index });
    } else {
      entry.count += 1;
    }
  });
  return grouped;
}
