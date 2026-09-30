import { describe, expect, it } from 'vitest';
import { diagnose } from '../../src/setup/diagnose.js';

const KEY = 'n8n_api_super_secret_key';

interface Route {
  status?: number;
  body?: unknown;
  fail?: Error;
}

function instance(routes: { workflows: Route; executions?: Route }, calls: string[] = []): typeof globalThis.fetch {
  return (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    const route = url.pathname.startsWith('/api/v1/workflows') ? routes.workflows : (routes.executions ?? {});
    if (route.fail !== undefined) {
      throw route.fail;
    }
    return new Response(JSON.stringify(route.body ?? { data: [] }), { status: route.status ?? 200 });
  }) as typeof globalThis.fetch;
}

function networkError(code: string): TypeError {
  return new TypeError('fetch failed', { cause: Object.assign(new Error(code), { code }) });
}

const good = { baseUrl: 'https://n8n.example.com', apiKey: KEY };

function status(result: Awaited<ReturnType<typeof diagnose>>, id: string): string | undefined {
  return result.steps.find((candidate) => candidate.id === id)?.status;
}

describe('diagnose', () => {
  it('passes every step and counts the workflows', async () => {
    const result = await diagnose({
      ...good,
      fetch: instance({ workflows: { body: { data: [{ id: '1' }, { id: '2' }] } } }),
    });

    expect(result.ok).toBe(true);
    expect(result.workflowCount).toBe(2);
    expect(result.host).toBe('n8n.example.com');
    expect(result.steps.map((item) => item.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
  });

  it('never returns the key, in any outcome', async () => {
    const outcomes = [
      await diagnose({ ...good, fetch: instance({ workflows: {} }) }),
      await diagnose({ ...good, fetch: instance({ workflows: { status: 401 } }) }),
      await diagnose({ ...good, fetch: instance({ workflows: { fail: networkError('ECONNREFUSED') } }) }),
    ];

    for (const outcome of outcomes) {
      expect(JSON.stringify(outcome)).not.toContain(KEY);
    }
  });

  describe('the address', () => {
    it('asks for one when it is missing', async () => {
      const result = await diagnose({ baseUrl: undefined, apiKey: KEY });

      expect(result.ok).toBe(false);
      expect(status(result, 'address')).toBe('failed');
      expect(status(result, 'reach')).toBe('skipped');
    });

    it('rejects text that is not an address', async () => {
      const result = await diagnose({ baseUrl: 'n8n dot example', apiKey: KEY });

      expect(status(result, 'address')).toBe('failed');
    });

    it('rejects an address that already ends in the API path', async () => {
      const result = await diagnose({ baseUrl: 'https://n8n.example.com/api/v1', apiKey: KEY });

      expect(result.steps[0]?.hint).toContain('GreenLight adds the rest');
    });

    it('rejects an address that carries a password', async () => {
      const result = await diagnose({ baseUrl: 'https://user:pass@n8n.example.com', apiKey: KEY });

      expect(status(result, 'address')).toBe('failed');
    });

    it('accepts plain http but warns that the key travels unencrypted', async () => {
      const result = await diagnose({
        baseUrl: 'http://n8n.example.com',
        apiKey: KEY,
        fetch: instance({ workflows: {} }),
      });

      expect(result.ok).toBe(true);
      expect(result.steps[0]?.hint).toContain('unencrypted');
    });

    it('does not warn about http on the same machine', async () => {
      const result = await diagnose({
        baseUrl: 'http://localhost:5678',
        apiKey: KEY,
        fetch: instance({ workflows: {} }),
      });

      expect(result.steps[0]?.hint).toBeUndefined();
    });
  });

  it('does not contact the instance without a key', async () => {
    const calls: string[] = [];
    const result = await diagnose({ baseUrl: good.baseUrl, apiKey: '  ', fetch: instance({ workflows: {} }, calls) });

    expect(calls).toEqual([]);
    expect(status(result, 'authenticate')).toBe('failed');
  });

  describe('what the instance answers', () => {
    it('explains a rejected key and does not blame the address', async () => {
      const result = await diagnose({ ...good, fetch: instance({ workflows: { status: 401 } }) });

      expect(status(result, 'reach')).toBe('ok');
      expect(status(result, 'authenticate')).toBe('failed');
      expect(status(result, 'executions')).toBe('skipped');
      expect(result.steps.find((item) => item.id === 'authenticate')?.hint).toContain('Settings');
    });

    it('explains a key that is valid but not allowed to read workflows', async () => {
      const result = await diagnose({ ...good, fetch: instance({ workflows: { status: 403 } }) });

      expect(result.steps.find((item) => item.id === 'authenticate')?.detail).toContain('not allowed');
    });

    it('recognises an address that has no n8n API', async () => {
      const result = await diagnose({ ...good, fetch: instance({ workflows: { status: 404 } }) });

      expect(status(result, 'reach')).toBe('failed');
      expect(result.steps.find((item) => item.id === 'reach')?.hint).toContain('without /api/v1');
    });

    it('reports a server error as a problem with the instance', async () => {
      const result = await diagnose({ ...good, fetch: instance({ workflows: { status: 502 } }) });

      expect(result.steps.find((item) => item.id === 'reach')?.detail).toContain('HTTP 502');
    });

    it('says when the key cannot read execution history', async () => {
      const result = await diagnose({
        ...good,
        fetch: instance({ workflows: {}, executions: { status: 403 } }),
      });

      expect(result.ok).toBe(false);
      expect(status(result, 'authenticate')).toBe('ok');
      expect(result.steps.find((item) => item.id === 'executions')?.detail).toContain('cannot read executions');
    });
  });

  describe('when the connection itself fails', () => {
    const cases: [string, string][] = [
      ['ENOTFOUND', 'could not be resolved'],
      ['ECONNREFUSED', 'Nothing is listening'],
      ['CERT_HAS_EXPIRED', 'certificate'],
      ['DEPTH_ZERO_SELF_SIGNED_CERT', 'certificate'],
    ];

    for (const [code, expected] of cases) {
      it(`explains ${code} in plain words`, async () => {
        const result = await diagnose({ ...good, fetch: instance({ workflows: { fail: networkError(code) } }) });

        expect(status(result, 'reach')).toBe('failed');
        expect(result.steps.find((item) => item.id === 'reach')?.detail).toContain(expected);
      });
    }

    it('explains a timeout', async () => {
      const timeout = new DOMException('The operation timed out.', 'TimeoutError');
      const result = await diagnose({
        ...good,
        timeoutMs: 3000,
        fetch: instance({ workflows: { fail: timeout } }),
      });

      expect(result.steps.find((item) => item.id === 'reach')?.detail).toContain('within 3 seconds');
    });

    it('falls back to a generic message that still carries the technical detail', async () => {
      const result = await diagnose({
        ...good,
        fetch: instance({ workflows: { fail: new TypeError('something odd') } }),
      });

      expect(result.steps.find((item) => item.id === 'reach')?.hint).toContain('something odd');
    });
  });
});
