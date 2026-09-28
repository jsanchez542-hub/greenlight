import { describe, expect, it } from 'vitest';
import { N8nApiError, N8nClient } from '../../src/n8n/client.js';

interface StubCall {
  url: URL;
  headers: Record<string, string>;
}

function stubFetch(pages: unknown[], calls: StubCall[] = []): typeof globalThis.fetch {
  let index = 0;
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const body = pages[Math.min(index, pages.length - 1)];
    index += 1;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof globalThis.fetch;
}

function client(fetchImpl: typeof globalThis.fetch, baseUrl = 'https://n8n.example.com'): N8nClient {
  return new N8nClient({ baseUrl, apiKey: 'test-key', fetch: fetchImpl });
}

describe('N8nClient', () => {
  it('authenticates with the API key header', async () => {
    const calls: StubCall[] = [];
    await client(stubFetch([{ data: [] }], calls)).listWorkflows();

    expect(calls[0]?.headers['X-N8N-API-KEY']).toBe('test-key');
  });

  it('follows the cursor until the last page', async () => {
    const executions = await client(
      stubFetch([
        { data: [{ id: '1' }, { id: '2' }], nextCursor: 'page-2' },
        { data: [{ id: '3' }], nextCursor: null },
      ]),
    ).listExecutions();

    expect(executions.map((execution) => execution.id)).toEqual(['1', '2', '3']);
  });

  it('stops once the requested limit is reached', async () => {
    const calls: StubCall[] = [];
    const executions = await client(
      stubFetch(
        [
          { data: [{ id: '1' }, { id: '2' }], nextCursor: 'page-2' },
          { data: [{ id: '3' }], nextCursor: 'page-3' },
        ],
        calls,
      ),
    ).listExecutions({ limit: 2 });

    expect(executions).toHaveLength(2);
    expect(calls).toHaveLength(1);
  });

  it('filters executions by workflow', async () => {
    const calls: StubCall[] = [];
    await client(stubFetch([{ data: [] }], calls)).listExecutions({ workflowId: 'abc' });

    expect(calls[0]?.url.searchParams.get('workflowId')).toBe('abc');
  });

  it('reports the status code when the API rejects the request', async () => {
    const unauthorized = (async () =>
      new Response('unauthorized', { status: 401 })) as typeof globalThis.fetch;

    await expect(client(unauthorized).listWorkflows()).rejects.toBeInstanceOf(N8nApiError);
  });

  it('accepts a base URL with a trailing slash', async () => {
    const calls: StubCall[] = [];
    await client(stubFetch([{ data: [] }], calls), 'https://n8n.example.com/').listWorkflows();

    expect(calls[0]?.url.pathname).toBe('/api/v1/workflows');
  });
});
