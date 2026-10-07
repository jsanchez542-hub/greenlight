import { describe, expect, it } from 'vitest';
import { sampleResult } from '@/lib/sample';
import { fetchSnapshot, requestScan } from '@/lib/snapshot-client';

const snapshot = { result: sampleResult, error: null, refreshing: false, intervalMinutes: 5, host: 'n8n.test' };

function respondWith(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

const signal = new AbortController().signal;

describe('fetchSnapshot', () => {
  it('returns the parsed snapshot', async () => {
    await expect(fetchSnapshot(signal, respondWith(snapshot))).resolves.toEqual(snapshot);
  });

  it('surfaces the kind of failure the server named', async () => {
    const fetchImpl = respondWith({ error: 'hostNotAllowed' }, 403);
    await expect(fetchSnapshot(signal, fetchImpl)).rejects.toMatchObject({ code: 'hostNotAllowed' });
  });

  it('never shows text the server wrote, only a kind it knows', async () => {
    const fetchImpl = respondWith({ error: 'This host is not allowed. <img src=x onerror=alert(1)>' }, 403);
    await expect(fetchSnapshot(signal, fetchImpl)).rejects.toMatchObject({ code: 'serverStatus' });
  });

  it('falls back to a generic failure when the server sent no kind', async () => {
    await expect(fetchSnapshot(signal, respondWith({}, 500))).rejects.toMatchObject({ code: 'serverStatus' });
  });

  it('rejects a body that does not follow the contract', async () => {
    await expect(fetchSnapshot(signal, respondWith({ result: 1 }))).rejects.toMatchObject({ code: 'invalidAnswer' });
  });

  it('explains a server that cannot be reached', async () => {
    const offline: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(fetchSnapshot(signal, offline)).rejects.toMatchObject({ code: 'serverSilent' });
  });

  it('passes an abort through untouched', async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted: typeof fetch = async () => {
      throw new DOMException('Aborted', 'AbortError');
    };
    await expect(fetchSnapshot(controller.signal, aborted)).rejects.toThrow('Aborted');
  });
});

describe('requestScan', () => {
  it('posts and reads the snapshot that comes back', async () => {
    const methods: string[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      methods.push(init?.method ?? 'GET');
      return new Response(JSON.stringify({ ...snapshot, refreshing: true }), { status: 202 });
    };

    const result = await requestScan(signal, fetchImpl);

    expect(methods).toEqual(['POST']);
    expect(result.refreshing).toBe(true);
  });
});

describe('a refresh the server refuses', () => {
  it('is reported as a refusal with the wait, not as a failure of the scan', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: 'A scan ran moments ago.' }), {
        status: 429,
        headers: { 'Retry-After': '17' },
      });

    await expect(requestScan(signal, fetchImpl)).rejects.toMatchObject({
      name: 'RefreshRefusedError',
      retryAfterSeconds: 17,
    });
  });

  it('falls back to a sensible wait when the header is missing or hostile', async () => {
    const fetchImpl: typeof fetch = async () => new Response('{}', { status: 429, headers: { 'Retry-After': 'soon' } });

    await expect(requestScan(signal, fetchImpl)).rejects.toMatchObject({ retryAfterSeconds: 30 });
  });
});
