import type { DetectorName, Finding, Severity } from '../analysis/types.js';

export interface TrackedFinding {
  key: string;
  workflowId: string;
  workflowName: string;
  detector: DetectorName;
  severity: Severity;
  summary: string;
  missedScans: number;
}

export type FindingTracker = Record<string, TrackedFinding>;

export interface FindingChanges {
  tracked: FindingTracker;
  added: TrackedFinding[];
  resolved: TrackedFinding[];
}

const severityRank: Record<Severity, number> = { warning: 1, critical: 2 };

export function atLeast(severity: Severity, minimum: Severity): boolean {
  return severityRank[severity] >= severityRank[minimum];
}

/**
 * A finding is identified by its workflow, its check and, for silent errors, the node.
 * The summary is left out on purpose: it carries counts that change from scan to scan.
 */
export function findingKey(finding: Finding): string {
  const node = finding.evidence['node'];
  const base = `${finding.workflowId}:${finding.detector}`;
  return typeof node === 'string' ? `${base}:${node}` : base;
}

/**
 * Compares this scan with what was tracked before. A finding that disappears is only
 * called resolved after it stays away for `clearAfterScans` scans in a row, because some
 * checks look at a moving window and a borderline case would otherwise alert every other scan.
 */
export function trackFindings(
  previous: FindingTracker,
  findings: Finding[],
  clearAfterScans: number,
): FindingChanges {
  const tracked: FindingTracker = {};
  const added: TrackedFinding[] = [];

  for (const finding of findings) {
    const key = findingKey(finding);
    tracked[key] = {
      key,
      workflowId: finding.workflowId,
      workflowName: finding.workflowName,
      detector: finding.detector,
      severity: finding.severity,
      summary: finding.summary,
      missedScans: 0,
    };
    if (previous[key] === undefined) {
      added.push(tracked[key]);
    }
  }

  const resolved: TrackedFinding[] = [];
  for (const [key, earlier] of Object.entries(previous)) {
    if (tracked[key] !== undefined) {
      continue;
    }
    const missedScans = earlier.missedScans + 1;
    if (missedScans >= clearAfterScans) {
      resolved.push(earlier);
    } else {
      tracked[key] = { ...earlier, missedScans };
    }
  }

  return { tracked, added, resolved };
}
