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

  describe('plain http', () => {
    const ok = stubFetch([{ data: [] }]);

    it('refuses to send the key over http to a public host', () => {
      expect(() => client(ok, 'http://n8n.example.com')).toThrow('travel unencrypted');
    });

    it('accepts http on this machine and on private networks', () => {
      for (const address of [
        'http://localhost:5678',
        'http://127.0.0.1:5678',
        'http://192.168.1.20:5678',
        'http://10.0.0.5',
        'http://n8n:5678',
        'http://nas.local',
      ]) {
        expect(() => client(ok, address)).not.toThrow();
      }
    });

    it('allows it on a public host only when the user asks for it explicitly', () => {
      expect(
        () => new N8nClient({ baseUrl: 'http://n8n.example.com', apiKey: 'k', fetch: ok, allowInsecureHttp: true }),
      ).not.toThrow();
    });

    it('does not mind https anywhere', () => {
      expect(() => client(ok, 'https://n8n.example.com')).not.toThrow();
    });
  });

  describe('redirects', () => {
    function redirecting(steps: { status: number; location?: string; body?: unknown }[], calls: StubCall[]) {
      let index = 0;
      return (async (input: string | URL | Request, init?: RequestInit) => {
        const url = input instanceof URL ? input : new URL(String(input));
        calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
        const step = steps[Math.min(index, steps.length - 1)] as { status: number; location?: string; body?: unknown };
        index += 1;
        const headers = step.location === undefined ? {} : { location: step.location };
        return new Response(step.body === undefined ? null : JSON.stringify(step.body), { status: step.status, headers });
      }) as typeof globalThis.fetch;
    }

    it('never lets the runtime follow a redirect on its own, because the key would travel with it', async () => {
      let seen: RequestInit | undefined;
      const spy = (async (_input: string | URL | Request, init?: RequestInit) => {
        seen = init;
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }) as typeof globalThis.fetch;

      await client(spy).listWorkflows();

      expect(seen?.redirect).toBe('manual');
    });

    it('refuses to send the key to a different host', async () => {
      const calls: StubCall[] = [];
      const attempt = client(
        redirecting([{ status: 302, location: 'https://attacker.example.net/collect' }], calls),
      ).listWorkflows();

      await expect(attempt).rejects.toThrow('different host');
      expect(calls).toHaveLength(1);
      expect(calls.some((call) => call.url.hostname === 'attacker.example.net')).toBe(false);
    });

    it('does not put the redirect target in the error, since it may carry a token', async () => {
      const attempt = client(
        redirecting([{ status: 302, location: 'https://other.example.net/x?token=abc123' }], []),
      ).listWorkflows();

      await expect(attempt).rejects.not.toThrow(/abc123/);
    });

    it('follows a redirect that stays on the same host, such as http to https', async () => {
      const calls: StubCall[] = [];
      const result = await new N8nClient({
        baseUrl: 'http://n8n.example.com',
        apiKey: 'test-key',
        allowInsecureHttp: true,
        fetch: redirecting(
          [
            { status: 301, location: 'https://n8n.example.com/api/v1/workflows?limit=250' },
            { status: 200, body: { data: [{ id: '1', name: 'A', active: true }] } },
          ],
          calls,
        ),
      }).listWorkflows();

      expect(result).toHaveLength(1);
      expect(calls[1]?.url.protocol).toBe('https:');
      expect(calls[1]?.headers['X-N8N-API-KEY']).toBe('test-key');
    });

    it('refuses a redirect from https down to http, which would send the key in the clear', async () => {
      const attempt = client(
        redirecting([{ status: 302, location: 'http://n8n.example.com/api/v1/workflows' }], []),
      ).listWorkflows();

      await expect(attempt).rejects.toThrow('unencrypted');
    });

    it('gives up on a redirect loop', async () => {
      const attempt = client(
        redirecting([{ status: 302, location: 'https://n8n.example.com/api/v1/workflows' }], []),
      ).listWorkflows();

      await expect(attempt).rejects.toThrow('too many redirects');
    });
  });

  describe('an answer that the n8n API would not give', () => {
    const NOT_THE_API = 'is not the n8n API';

    it.each([
      ['a document without the list', {}],
      ['a list that is text', { data: 'text' }],
      ['a list that is an object', { data: { 0: { id: '1' } } }],
      ['a list of something other than documents', { data: [null] }],
      ['nothing', null],
      ['a bare list', [{ id: '1' }]],
      ['text', 'text'],
    ])('refuses %s where a page of a list was asked for', async (_shape, body) => {
      const attempt = client(stubFetch([body])).listWorkflows();

      await expect(attempt).rejects.toBeInstanceOf(N8nApiError);
      await expect(attempt).rejects.toThrow(NOT_THE_API);
    });

    it.each([
      ['nothing', null],
      ['a list', [{ id: '1' }]],
      ['text', 'text'],
    ])('refuses %s where a workflow or an execution was asked for', async (_shape, body) => {
      await expect(client(stubFetch([body])).getWorkflow('1')).rejects.toThrow(NOT_THE_API);
      await expect(client(stubFetch([body])).getExecution('1')).rejects.toThrow(NOT_THE_API);
    });

    it('refuses a web page, such as the one a proxy shows before letting anyone in', async () => {
      const page = (async () =>
        new Response('<!doctype html><title>Welcome</title>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        })) as typeof globalThis.fetch;

      const attempt = client(page).listWorkflows();

      await expect(attempt).rejects.toBeInstanceOf(N8nApiError);
      await expect(attempt).rejects.toThrow(NOT_THE_API);
    });

    it('keeps the status of the answer, which was a success', async () => {
      const error: unknown = await client(stubFetch([{}]))
        .listWorkflows()
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(N8nApiError);
      expect((error as N8nApiError).status).toBe(200);
    });

    it('does not repeat what was answered, which can hold anything', async () => {
      const attempt = client(stubFetch([{ data: 'text-that-must-not-travel' }])).listWorkflows();

      await expect(attempt).rejects.not.toThrow(/text-that-must-not-travel/);
    });

    it('does not blame the address when the network fails while the answer is read', async () => {
      const cutOff = (async () =>
        ({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => {
            throw new TypeError('terminated');
          },
        }) as unknown as Response) as typeof globalThis.fetch;

      const attempt = client(cutOff).listWorkflows();

      await expect(attempt).rejects.toThrow('terminated');
      await expect(attempt).rejects.not.toBeInstanceOf(N8nApiError);
    });

    it('stops at a cursor that is not text', async () => {
      let requests = 0;
      const onePage = (async () => {
        requests += 1;
        if (requests > 1) {
          throw new Error('asked for a page that does not exist');
        }
        return new Response(JSON.stringify({ data: [{ id: '1' }], nextCursor: 7 }), { status: 200 });
      }) as typeof globalThis.fetch;

      const workflows = await client(onePage).listWorkflows();

      expect(workflows).toHaveLength(1);
      expect(requests).toBe(1);
    });
  });

  it('accepts a base URL with a trailing slash', async () => {
    const calls: StubCall[] = [];
    await client(stubFetch([{ data: [] }], calls), 'https://n8n.example.com/').listWorkflows();

    expect(calls[0]?.url.pathname).toBe('/api/v1/workflows');
  });
});

describe('withoutTrailingSlashes', () => {
  it('removes every trailing slash and nothing else', async () => {
    const { withoutTrailingSlashes } = await import('../../src/n8n/client.js');

    expect(withoutTrailingSlashes('https://n8n.example.com/')).toBe('https://n8n.example.com');
    expect(withoutTrailingSlashes('https://n8n.example.com///')).toBe('https://n8n.example.com');
    expect(withoutTrailingSlashes('https://n8n.example.com/a/b')).toBe('https://n8n.example.com/a/b');
    expect(withoutTrailingSlashes('///')).toBe('');
    expect(withoutTrailingSlashes('')).toBe('');
  });

  it('stays fast on a long run of slashes', async () => {
    const { withoutTrailingSlashes } = await import('../../src/n8n/client.js');
    const hostile = `https://n8n.example.com/${'/'.repeat(200_000)}x`;
    const started = performance.now();

    expect(withoutTrailingSlashes(hostile)).toBe(hostile);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
