import { describe, expect, it } from 'vitest';
import { demoResult } from '@/lib/demo';
import { requestLiveScan } from '@/lib/scan-client';

function respondWith(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

const signal = new AbortController().signal;

describe('requestLiveScan', () => {
  it('returns the parsed result on success', async () => {
    await expect(requestLiveScan(signal, respondWith(demoResult))).resolves.toEqual(demoResult);
  });

  it('surfaces the message the server sent', async () => {
    const fetchImpl = respondWith({ error: 'The scan could not finish: n8n API returned 401.' }, 502);
    await expect(requestLiveScan(signal, fetchImpl)).rejects.toThrow('n8n API returned 401');
  });

  it('names the status when the server sent no message', async () => {
    await expect(requestLiveScan(signal, respondWith({}, 500))).rejects.toThrow('status 500');
  });

  it('rejects a body that does not follow the contract', async () => {
    await expect(requestLiveScan(signal, respondWith({ version: 1 }))).rejects.toThrow(
      'not valid',
    );
  });

  it('explains a server that cannot be reached', async () => {
    const offline: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(requestLiveScan(signal, offline)).rejects.toThrow('did not answer');
  });

  it('passes an abort through untouched', async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted: typeof fetch = async () => {
      throw new DOMException('Aborted', 'AbortError');
    };
    await expect(requestLiveScan(controller.signal, aborted)).rejects.toThrow('Aborted');
  });
});
