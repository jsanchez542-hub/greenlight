import type { DetectorName, Finding, Severity } from 'greenlight';
import { detectorNames, severities } from './status';

export interface KeyedFinding {
  key: string;
  finding: Finding;
}

export interface FindingFilter {
  severity: Severity | 'all';
  check: DetectorName | 'all';
}

export interface FindingCounts {
  bySeverity: Record<Severity, number>;
  byCheck: Record<DetectorName, number>;
}

export const noFindingFilter: FindingFilter = { severity: 'all', check: 'all' };

export function keyFindings(findings: readonly Finding[]): KeyedFinding[] {
  const occurrences = new Map<string, number>();
  return findings.map((finding) => {
    const base = `${finding.workflowId}:${finding.detector}`;
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    return { key: `${base}:${occurrence}`, finding };
  });
}

export function filterFindings(
  entries: readonly KeyedFinding[],
  filter: FindingFilter,
): KeyedFinding[] {
  return entries.filter(
    ({ finding }) =>
      (filter.severity === 'all' || finding.severity === filter.severity) &&
      (filter.check === 'all' || finding.detector === filter.check),
  );
}

export function countFindings(entries: readonly KeyedFinding[]): FindingCounts {
  const bySeverity = Object.fromEntries(severities.map((severity) => [severity, 0])) as Record<
    Severity,
    number
  >;
  const byCheck = Object.fromEntries(detectorNames.map((name) => [name, 0])) as Record<
    DetectorName,
    number
  >;
  for (const { finding } of entries) {
    bySeverity[finding.severity] += 1;
    byCheck[finding.detector] += 1;
  }
  return { bySeverity, byCheck };
}

type ParamSource = { get(name: string): string | null };

function pick<T extends string>(raw: string | null, options: readonly T[]): T | 'all' {
  return options.find((option) => option === raw) ?? 'all';
}

export function parseFindingFilter(params: ParamSource): FindingFilter {
  return {
    severity: pick(params.get('severity'), severities),
    check: pick(params.get('check'), detectorNames),
  };
}

export function findingFilterToParams(filter: FindingFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.severity !== 'all') {
    params.set('severity', filter.severity);
  }
  if (filter.check !== 'all') {
    params.set('check', filter.check);
  }
  return params;
}
