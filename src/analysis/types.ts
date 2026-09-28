import type { Execution, ExecutionDetail, Workflow } from '../n8n/types.js';

export type DetectorName =
  | 'duration-drift'
  | 'silent-error'
  | 'silence'
  | 'frequency-drop';

export type Severity = 'warning' | 'critical';

export interface Finding {
  workflowId: string;
  workflowName: string;
  detector: DetectorName;
  severity: Severity;
  summary: string;
  evidence: Record<string, string | number>;
}

export interface AnalysisOptions {
  recentWindowHours: number;
  minBaselineSamples: number;
  minRecentSamples: number;
  durationDriftFactor: number;
  silenceFactor: number;
  frequencyDropRatio: number;
}

export const defaultAnalysisOptions: AnalysisOptions = {
  recentWindowHours: 24,
  minBaselineSamples: 10,
  minRecentSamples: 3,
  durationDriftFactor: 2,
  silenceFactor: 4,
  frequencyDropRatio: 0.5,
};

export interface DetectorInput {
  workflow: Workflow;
  executions: Execution[];
  executionDetails: ExecutionDetail[];
  now: Date;
  options: AnalysisOptions;
}

export type Detector = (input: DetectorInput) => Finding[];
