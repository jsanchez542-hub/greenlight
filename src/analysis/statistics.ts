import type { Execution } from '../n8n/types.js';

export interface DurationStats {
  count: number;
  medianMs: number;
  p95Ms: number;
}

export function percentile(sortedValues: number[], fraction: number): number {
  if (sortedValues.length === 0) {
    throw new RangeError('percentile requires at least one value');
  }
  const rank = Math.ceil(fraction * sortedValues.length);
  const index = Math.min(Math.max(rank - 1, 0), sortedValues.length - 1);
  return sortedValues[index] as number;
}

export function durationsMs(executions: Execution[]): number[] {
  const values: number[] = [];
  for (const execution of executions) {
    if (execution.stoppedAt === null) {
      continue;
    }
    const elapsed = Date.parse(execution.stoppedAt) - Date.parse(execution.startedAt);
    if (Number.isFinite(elapsed) && elapsed >= 0) {
      values.push(elapsed);
    }
  }
  return values;
}

export function durationStats(executions: Execution[]): DurationStats | null {
  const values = durationsMs(executions).sort((a, b) => a - b);
  if (values.length === 0) {
    return null;
  }
  return {
    count: values.length,
    medianMs: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
  };
}

export interface IntervalStats {
  medianMs: number;
  p95Ms: number;
  regular: boolean;
}

const REGULARITY_LIMIT = 3;

export function intervalStats(executions: Execution[]): IntervalStats | null {
  const starts = executions
    .map((execution) => Date.parse(execution.startedAt))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (starts.length < 3) {
    return null;
  }

  const gaps: number[] = [];
  for (let index = 1; index < starts.length; index += 1) {
    gaps.push((starts[index] as number) - (starts[index - 1] as number));
  }
  gaps.sort((a, b) => a - b);

  const medianMs = percentile(gaps, 0.5);
  const p95Ms = percentile(gaps, 0.95);

  return {
    medianMs,
    p95Ms,
    regular: medianMs > 0 && p95Ms <= medianMs * REGULARITY_LIMIT,
  };
}

export function lastStartedAt(executions: Execution[]): Date | null {
  let latest = Number.NEGATIVE_INFINITY;
  for (const execution of executions) {
    const startedAt = Date.parse(execution.startedAt);
    if (Number.isFinite(startedAt) && startedAt > latest) {
      latest = startedAt;
    }
  }
  return latest === Number.NEGATIVE_INFINITY ? null : new Date(latest);
}

export function splitByWindow(
  executions: Execution[],
  now: Date,
  recentWindowHours: number,
): { baseline: Execution[]; recent: Execution[] } {
  const cutoff = now.getTime() - recentWindowHours * 60 * 60 * 1000;
  const baseline: Execution[] = [];
  const recent: Execution[] = [];

  for (const execution of executions) {
    const startedAt = Date.parse(execution.startedAt);
    if (!Number.isFinite(startedAt)) {
      continue;
    }
    (startedAt >= cutoff ? recent : baseline).push(execution);
  }

  return { baseline, recent };
}
