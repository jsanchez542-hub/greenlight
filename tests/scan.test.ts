import { describe, expect, it } from 'vitest';
import { MAX_CONCURRENCY } from '../src/concurrency.js';
import { N8nApiError, N8nClient } from '../src/n8n/client.js';
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

describe('scan with several workflows read at once', () => {
  interface Traffic {
    requests: number;
    inFlight: number;
    peak: number;
  }

  const crowd: WorkflowDetail[] = Array.from({ length: 12 }, (_, index) => ({
    id: `wf-${index}`,
    name: `Workflow ${String(index).padStart(2, '0')}`,
    active: true,
    nodes: [{ name: 'Every hour', type: 'n8n-nodes-base.scheduleTrigger' }],
  }));
  const crowdExecutions = Object.fromEntries(crowd.map(({ id }) => [id, hourly(id, 30)]));
  // Every third workflow reports success while one of its steps returns an error.
  const failsSilently = (workflowId: string): boolean => Number(workflowId.slice(3)) % 3 === 0;

  function workflowOf(url: URL): string | null {
    const last = url.pathname.split('/').at(-1) ?? '';
    if (url.pathname === '/api/v1/workflows') {
      return null;
    }
    if (url.pathname === '/api/v1/executions') {
      return url.searchParams.get('workflowId');
    }
    return url.pathname.startsWith('/api/v1/workflows/') ? last : last.split('-').slice(0, 2).join('-');
  }

  function crowdInstance(traffic: Traffic, broken: Record<string, number> = {}): typeof globalThis.fetch {
    return (async (input: string | URL | Request) => {
      const url = input instanceof URL ? input : new URL(String(input));
      const workflowId = workflowOf(url);
      traffic.requests += 1;
      traffic.inFlight += 1;
      traffic.peak = Math.max(traffic.peak, traffic.inFlight);

      try {
        // The later a workflow is in the list, the faster it answers, so they do not finish in list order.
        const turns = workflowId === null ? 0 : (crowd.length - 1 - Number(workflowId.slice(3))) * 2;
        for (let turn = 0; turn < turns; turn += 1) {
          await Promise.resolve();
        }

        const status = workflowId === null ? undefined : broken[workflowId];
        if (status !== undefined && url.pathname.startsWith('/api/v1/workflows/')) {
          return new Response('broken', { status });
        }

        let body: unknown;
        if (url.pathname === '/api/v1/workflows') {
          body = { data: crowd.map(({ id, name, active }) => ({ id, name, active })) };
        } else if (url.pathname.startsWith('/api/v1/workflows/')) {
          body = crowd.find((workflow) => workflow.id === workflowId);
        } else if (url.pathname === '/api/v1/executions') {
          body = { data: crowdExecutions[workflowId ?? ''] ?? [] };
        } else {
          const execution = Object.values(crowdExecutions)
            .flat()
            .find((candidate) => candidate.id === url.pathname.split('/').at(-1));
          body =
            execution === undefined
              ? undefined
              : detail(execution, failsSilently(execution.workflowId) ? { error: 'Account Restricted' } : { id: 'ok' });
        }

        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      } finally {
        traffic.inFlight -= 1;
      }
    }) as typeof globalThis.fetch;
  }

  function newTraffic(): Traffic {
    return { requests: 0, inFlight: 0, peak: 0 };
  }

  function clientFor(traffic: Traffic, broken?: Record<string, number>): N8nClient {
    return new N8nClient({
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-key',
      fetch: crowdInstance(traffic, broken),
    });
  }

  function runCrowd(concurrency: number | undefined, traffic = newTraffic()) {
    return scan(clientFor(traffic), {
      executionLimit: 200,
      detailSampleSize: 5,
      now: NOW,
      ...(concurrency === undefined ? {} : { concurrency }),
    });
  }

  it('gives the same result whatever the number of workflows read at once', async () => {
    const sequential = await runCrowd(1);

    expect(sequential.findings.map((finding) => finding.workflowId)).toEqual(['wf-0', 'wf-3', 'wf-6', 'wf-9']);
    for (const concurrency of [2, 4, MAX_CONCURRENCY]) {
      expect(JSON.stringify(await runCrowd(concurrency))).toBe(JSON.stringify(sequential));
    }
  });

  it('never has more requests in flight than the number it was told to read at once', async () => {
    const traffic = newTraffic();
    await runCrowd(3, traffic);

    expect(traffic.peak).toBe(3);
  });

  it('reads one workflow at a time unless told otherwise, as version 1.0 did', async () => {
    const traffic = newTraffic();
    await runCrowd(undefined, traffic);

    expect(traffic.peak).toBe(1);
  });

  it('refuses a number it cannot honour before sending any request', async () => {
    for (const concurrency of [0, -1, 1.5, Number.NaN, MAX_CONCURRENCY + 1]) {
      const traffic = newTraffic();

      await expect(runCrowd(concurrency, traffic)).rejects.toThrow(RangeError);
      expect(traffic.requests).toBe(0);
    }
  });

  it('fails with the error of the earliest workflow that fails, as a one-by-one scan would', async () => {
    async function statusOfFailure(concurrency: number): Promise<number | undefined> {
      try {
        await scan(clientFor(newTraffic(), { 'wf-2': 500, 'wf-7': 503 }), {
          executionLimit: 200,
          detailSampleSize: 5,
          now: NOW,
          concurrency,
        });
      } catch (error) {
        return error instanceof N8nApiError ? error.status : undefined;
      }
      return undefined;
    }

    expect(await statusOfFailure(1)).toBe(500);
    expect(await statusOfFailure(4)).toBe(500);
    expect(await statusOfFailure(MAX_CONCURRENCY)).toBe(500);
  });
});
