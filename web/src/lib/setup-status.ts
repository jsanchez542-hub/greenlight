import type { CheckStep, Diagnosis, StepId, StepStatus, WorkflowHealth } from 'greenlight';
import { asBoolean, asCount, asRecord, asString } from './scan-result';

export interface SetupStatus {
  hasAddress: boolean;
  hasKey: boolean;
  diagnosis: Diagnosis;
}

const stepIds: readonly StepId[] = ['address', 'reach', 'authenticate', 'executions'];
const stepStatuses: readonly StepStatus[] = ['ok', 'failed', 'skipped'];

function oneOf<T extends string>(value: unknown, options: readonly T[], path: string): T {
  const text = asString(value, path);
  const match = options.find((option) => option === text);
  if (match === undefined) {
    throw new Error(`The setup status is not valid: ${path} should be one of ${options.join(', ')}.`);
  }
  return match;
}

function parseStep(value: unknown, index: number): CheckStep {
  const path = `steps[${index}]`;
  const fields = asRecord(value, path);
  const step: CheckStep = {
    id: oneOf(fields['id'], stepIds, `${path}.id`),
    label: asString(fields['label'], `${path}.label`),
    status: oneOf(fields['status'], stepStatuses, `${path}.status`),
    detail: asString(fields['detail'], `${path}.detail`),
  };
  return fields['hint'] === undefined ? step : { ...step, hint: asString(fields['hint'], `${path}.hint`) };
}

export function parseSetupStatus(value: unknown): SetupStatus {
  const fields = asRecord(value, 'the setup status');
  const diagnosis = asRecord(fields['diagnosis'], 'diagnosis');
  if (!Array.isArray(diagnosis['steps'])) {
    throw new Error('The setup status is not valid: diagnosis.steps should be a list.');
  }
  return {
    hasAddress: asBoolean(fields['hasAddress'], 'hasAddress'),
    hasKey: asBoolean(fields['hasKey'], 'hasKey'),
    diagnosis: {
      ok: asBoolean(diagnosis['ok'], 'diagnosis.ok'),
      steps: diagnosis['steps'].map(parseStep),
      workflowCount: diagnosis['workflowCount'] === null ? null : asCount(diagnosis['workflowCount'], 'diagnosis.workflowCount'),
      host: diagnosis['host'] === null ? null : asString(diagnosis['host'], 'diagnosis.host'),
    },
  };
}

export function stepIconState(status: StepStatus): WorkflowHealth {
  if (status === 'ok') {
    return 'healthy';
  }
  return status === 'failed' ? 'critical' : 'no-runs';
}

export const stepStatusLabel: Record<StepStatus, string> = {
  ok: 'Passed',
  failed: 'Failed',
  skipped: 'Skipped',
};

export type SetupPhase = 'waiting' | 'failing' | 'connected';

export function setupPhase(status: SetupStatus): SetupPhase {
  if (status.diagnosis.ok) {
    return 'connected';
  }
  return status.hasAddress || status.hasKey ? 'failing' : 'waiting';
}

export function pollDelayMs(phase: SetupPhase): number | null {
  switch (phase) {
    case 'connected':
      return null;
    case 'failing':
      return 10_000;
    default:
      return 4_000;
  }
}
