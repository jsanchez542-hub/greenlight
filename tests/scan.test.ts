import { describe, expect, it } from 'vitest';
import { N8nClient } from '../src/n8n/client.js';
import { scan } from '../src/scan.js';
import type { Execution, ExecutionDetail, WorkflowDetail } from '../src/n8n/types.js';

const NOW = new Date('2026-01-10T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function hourly(workflowId: string, count: number): Execution[] {
  return Array.from({ length: count }, (_, index) => {
    const startedAt = new Date(NOW.getTime() - index * HOUR);
    return {
      id: `${workflowId}-${index}`,
      workflowId,
      status: 'success' as const,
      startedAt: startedAt.toISOString(),
      stoppedAt: new Date(startedAt.getTime() + 900).toISOString(),
    };
  });
}

function detail(execution: Execution, output: Record<string, unknown>): ExecutionDetail {
  return {
    ...execution,
    data: { resultData: { runData: { 'Send receipt': [{ data: { main: [[{ json: output }]] } }] } } },
  };
}

const workflows: WorkflowDetail[] = [
  {
    id: 'wf-form',
    name: 'Contact form',
    active: true,
    nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
  },
  {
    id: 'wf-nightly',
    name: 'Nightly digest',
    active: true,
    nodes: [{ name: 'Every hour', type: 'n8n-nodes-base.scheduleTrigger' }],
  },
  {
    id: 'wf-orders',
    name: 'Order confirmations',
    active: true,
    nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
  },
];

const executions: Record<string, Execution[]> = {
  'wf-form': [],
  'wf-nightly': hourly('wf-nightly', 30),
  'wf-orders': hourly('wf-orders', 30),
};

function fakeInstance(): typeof globalThis.fetch {
  return (async (input: string | URL | Request) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const path = url.pathname;
    let body: unknown;

    if (path === '/api/v1/workflows') {
      body = { data: workflows.map(({ id, name, active }) => ({ id, name, active })) };
    } else if (path.startsWith('/api/v1/workflows/')) {
      body = workflows.find((workflow) => path.endsWith(`/${workflow.id}`));
    } else if (path === '/api/v1/executions') {
      body = { data: executions[url.searchParams.get('workflowId') ?? ''] ?? [] };
    } else {
      const id = path.split('/').at(-1) ?? '';
      const execution = Object.values(executions)
        .flat()
        .find((candidate) => candidate.id === id);
      if (execution === undefined) {
        return new Response('not found', { status: 404 });
      }
      body = detail(
        execution,
        execution.workflowId === 'wf-orders' ? { error: 'Account Restricted' } : { id: 'ok' },
      );
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof globalThis.fetch;
}

async function run() {
  const client = new N8nClient({
    baseUrl: 'https://n8n.example.com',
    apiKey: 'test-key',
    fetch: fakeInstance(),
  });
  return scan(client, { executionLimit: 200, detailSampleSize: 5, now: NOW });
}

describe('scan', () => {
  it('summarises every workflow, including the ones with nothing to judge', async () => {
    const result = await run();

    expect(result.version).toBe(1);
    expect(result.workflowsScanned).toBe(3);
    expect(result.workflows.map((workflow) => [workflow.name, workflow.health])).toEqual([
      ['Order confirmations', 'critical'],
      ['Nightly digest', 'healthy'],
      ['Contact form', 'no-runs'],
    ]);
  });

  it('reports how each workflow is triggered and when it last ran', async () => {
    const result = await run();
    const byId = Object.fromEntries(result.workflows.map((workflow) => [workflow.id, workflow]));

    expect(byId['wf-nightly']?.trigger).toBe('schedule');
    expect(byId['wf-nightly']?.executionsRead).toBe(30);
    expect(byId['wf-nightly']?.lastStartedAt).toBe(NOW.toISOString());
    expect(byId['wf-form']?.trigger).toBe('event');
    expect(byId['wf-form']?.lastStartedAt).toBeNull();
  });

  it('attributes each finding to the workflow it came from', async () => {
    const result = await run();

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.workflowId).toBe('wf-orders');
    expect(result.findings[0]?.detector).toBe('silent-error');
  });
});
