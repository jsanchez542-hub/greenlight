import { describe, expect, it } from 'vitest';
import { readNodeRuns } from '../../src/n8n/run-data.js';
import type { ExecutionDetail } from '../../src/n8n/types.js';

function detailWith(runData: unknown): ExecutionDetail {
  return {
    id: 'e-1',
    workflowId: 'wf-1',
    status: 'success',
    startedAt: '2026-01-10T12:00:00.000Z',
    stoppedAt: '2026-01-10T12:00:01.000Z',
    data: { resultData: { runData } },
  } as unknown as ExecutionDetail;
}

describe('readNodeRuns', () => {
  it('reads the status, the failure and the items of each run, by connection', () => {
    const nodes = readNodeRuns(
      detailWith({
        Send: [
          {
            executionStatus: 'error',
            error: { name: 'NodeApiError', message: 'broke' },
            data: { ai_tool: [[{ json: { error: 'broke' } }]] },
          },
        ],
        Fetch: [{ executionStatus: 'success', data: { main: [[{ json: { id: 1 } }, { json: { id: 2 } }], [{ json: { id: 3 } }]] } }],
      }),
    );

    expect(nodes.get('Send')).toEqual([
      { executionStatus: 'error', failed: true, outputs: new Map([['ai_tool', [{ error: 'broke' }]]]) },
    ]);
    expect(nodes.get('Fetch')?.[0]?.outputs.get('main')).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(nodes.get('Fetch')?.[0]?.failed).toBe(false);
  });

  it('keeps a branch that n8n left empty from hiding the ones next to it', () => {
    const nodes = readNodeRuns(detailWith({ Route: [{ data: { main: [null, [{ json: { id: 7 } }]] } }] }));

    expect(nodes.get('Route')?.[0]?.outputs.get('main')).toEqual([{ id: 7 }]);
  });

  it('gives an empty answer when there is no run data to read', () => {
    expect(readNodeRuns(detailWith(undefined)).size).toBe(0);
    expect(readNodeRuns(detailWith(null)).size).toBe(0);
    expect(readNodeRuns(detailWith([{ data: {} }])).size).toBe(0);
    expect(readNodeRuns({ id: 'e', workflowId: 'w', status: 'success', startedAt: '', stoppedAt: null }).size).toBe(0);
  });

  it('skips what is not shaped like a run and keeps the rest', () => {
    const nodes = readNodeRuns(
      detailWith({
        NotAList: { data: { main: [] } },
        Mixed: [null, 'text', 4, { executionStatus: 7, error: 'text', data: { main: 'text', ai_tool: [[{ json: 'text' }, { json: { ok: true } }]] } }],
      }),
    );

    expect(nodes.has('NotAList')).toBe(false);
    expect(nodes.get('Mixed')).toEqual([
      { executionStatus: null, failed: false, outputs: new Map([['main', []], ['ai_tool', [{ ok: true }]]]) },
    ]);
  });

  it('keeps a node called __proto__ as a name and nothing more', () => {
    const runData: unknown = JSON.parse('{"__proto__":[{"data":{"main":[[{"json":{"error":"x"}}]]}}]}');

    const nodes = readNodeRuns(detailWith(runData));

    expect([...nodes.keys()]).toEqual(['__proto__']);
    expect(nodes.get('__proto__')?.[0]?.outputs.get('main')).toEqual([{ error: 'x' }]);
    expect(({} as Record<string, unknown>)['error']).toBeUndefined();
  });
});
