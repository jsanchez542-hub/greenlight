import type { DetectorName, Finding, ScanResult, WorkflowHealth, WorkflowSummary } from 'greenlight';
import { detectorNames, healthStates, severities } from './status';

export class InvalidScanResultError extends Error {
  constructor(path: string, expected: string) {
    super(`The scan result is not valid: ${path} should be ${expected}.`);
    this.name = 'InvalidScanResultError';
  }
}

type Fields = Record<string, unknown>;

export function asRecord(value: unknown, path: string): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidScanResultError(path, 'an object');
  }
  return value as Fields;
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new InvalidScanResultError(path, 'a list');
  }
  return value;
}

export function asString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new InvalidScanResultError(path, 'text');
  }
  return value;
}

export function asCount(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new InvalidScanResultError(path, 'a whole number');
  }
  return value;
}

export function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new InvalidScanResultError(path, 'true or false');
  }
  return value;
}

function asTimestamp(value: unknown, path: string): string {
  const text = asString(value, path);
  if (Number.isNaN(Date.parse(text))) {
    throw new InvalidScanResultError(path, 'an ISO 8601 date');
  }
  return text;
}

function asOneOf<T extends string>(value: unknown, options: readonly T[], path: string): T {
  const text = asString(value, path);
  const match = options.find((option) => option === text);
  if (match === undefined) {
    throw new InvalidScanResultError(path, `one of ${options.join(', ')}`);
  }
  return match;
}

function parseEvidence(value: unknown, path: string): Finding['evidence'] {
  return Object.fromEntries(
    Object.entries(asRecord(value, path)).map(([key, entry]) => {
      if (typeof entry !== 'string' && typeof entry !== 'number') {
        throw new InvalidScanResultError(`${path}.${key}`, 'text or a number');
      }
      return [key, entry];
    }),
  );
}

function parseWorkflow(value: unknown, path: string): WorkflowSummary {
  const fields = asRecord(value, path);
  return {
    id: asString(fields['id'], `${path}.id`),
    name: asString(fields['name'], `${path}.name`),
    active: asBoolean(fields['active'], `${path}.active`),
    trigger: asOneOf(fields['trigger'], ['schedule', 'event'], `${path}.trigger`),
    executionsRead: asCount(fields['executionsRead'], `${path}.executionsRead`),
    lastStartedAt:
      fields['lastStartedAt'] === null
        ? null
        : asTimestamp(fields['lastStartedAt'], `${path}.lastStartedAt`),
    health: asOneOf<WorkflowHealth>(fields['health'], healthStates, `${path}.health`),
  };
}

function parseFinding(value: unknown, path: string): Finding {
  const fields = asRecord(value, path);
  return {
    workflowId: asString(fields['workflowId'], `${path}.workflowId`),
    workflowName: asString(fields['workflowName'], `${path}.workflowName`),
    detector: asOneOf<DetectorName>(fields['detector'], detectorNames, `${path}.detector`),
    severity: asOneOf(fields['severity'], severities, `${path}.severity`),
    summary: asString(fields['summary'], `${path}.summary`),
    evidence: parseEvidence(fields['evidence'], `${path}.evidence`),
  };
}

export function parseScanResult(value: unknown): ScanResult {
  const fields = asRecord(value, 'the result');
  if (fields['version'] !== 1) {
    throw new InvalidScanResultError('version', '1, the only version this dashboard reads');
  }
  return {
    version: 1,
    scannedAt: asTimestamp(fields['scannedAt'], 'scannedAt'),
    workflowsScanned: asCount(fields['workflowsScanned'], 'workflowsScanned'),
    workflows: asArray(fields['workflows'], 'workflows').map((entry, index) =>
      parseWorkflow(entry, `workflows[${index}]`),
    ),
    findings: asArray(fields['findings'], 'findings').map((entry, index) =>
      parseFinding(entry, `findings[${index}]`),
    ),
  };
}
