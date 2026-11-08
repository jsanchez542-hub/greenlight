import type { ExecutionDetail } from './types.js';

export type JsonRecord = Record<string, unknown>;

/** What one run of a node left in an execution, reduced to what the checks look at. */
export interface RunView {
  executionStatus: string | null;
  failed: boolean;
  /** The json of every item the run produced, by the kind of connection it left through ("main", "ai_tool"...). */
  outputs: ReadonlyMap<string, readonly JsonRecord[]>;
}

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonOfItems(branches: unknown): JsonRecord[] {
  if (!Array.isArray(branches)) {
    return [];
  }
  const found: JsonRecord[] = [];
  for (const branch of branches) {
    if (!Array.isArray(branch)) {
      continue;
    }
    for (const item of branch) {
      if (isRecord(item) && isRecord(item['json'])) {
        found.push(item['json']);
      }
    }
  }
  return found;
}

function readRun(raw: unknown): RunView | null {
  if (!isRecord(raw)) {
    return null;
  }
  const outputs = new Map<string, JsonRecord[]>();
  if (isRecord(raw['data'])) {
    for (const [connection, branches] of Object.entries(raw['data'])) {
      outputs.set(connection, jsonOfItems(branches));
    }
  }
  return {
    executionStatus: typeof raw['executionStatus'] === 'string' ? raw['executionStatus'] : null,
    failed: isRecord(raw['error']),
    outputs,
  };
}

/**
 * What each node did in one execution. The instance wrote this data, so it is not trusted:
 * anything that is not shaped the way n8n shapes it is skipped, and one odd node never
 * stops the rest from being read. Names are keys of a Map because a node can be called
 * anything, including `__proto__`.
 */
export function readNodeRuns(execution: ExecutionDetail): Map<string, RunView[]> {
  const nodes = new Map<string, RunView[]>();
  const resultData = isRecord(execution.data) ? execution.data['resultData'] : undefined;
  const runData = isRecord(resultData) ? resultData['runData'] : undefined;
  if (!isRecord(runData)) {
    return nodes;
  }
  for (const [nodeName, rawRuns] of Object.entries(runData)) {
    if (!Array.isArray(rawRuns)) {
      continue;
    }
    const runs: RunView[] = [];
    for (const rawRun of rawRuns) {
      const run = readRun(rawRun);
      if (run !== null) {
        runs.push(run);
      }
    }
    nodes.set(nodeName, runs);
  }
  return nodes;
}
