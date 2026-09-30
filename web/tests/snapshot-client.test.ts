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

  it('surfaces the message the server sent', async () => {
    const fetchImpl = respondWith({ error: 'This host is not allowed.' }, 403);
    await expect(fetchSnapshot(signal, fetchImpl)).rejects.toThrow('This host is not allowed.');
  });

  it('names the status when the server sent no message', async () => {
    await expect(fetchSnapshot(signal, respondWith({}, 500))).rejects.toThrow('status 500');
  });

  it('rejects a body that does not follow the contract', async () => {
    await expect(fetchSnapshot(signal, respondWith({ result: 1 }))).rejects.toThrow('not valid');
  });

  it('explains a server that cannot be reached', async () => {
    const offline: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(fetchSnapshot(signal, offline)).rejects.toThrow('did not answer');
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
