import { describe, expect, it } from 'vitest';
import { parseAddress, settingsLink } from '@/lib/address';
import { requestConnect, requestDisconnect } from '@/lib/connect-client';

const signal = new AbortController().signal;

const diagnosis = {
  ok: true,
  host: 'n8n.example.com',
  workflowCount: 4,
  steps: [{ id: 'address', label: 'The address looks valid', status: 'ok', detail: 'The address is valid.' }],
};

function respondWith(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

describe('settingsLink', () => {
  it('points at the page of the typed address where keys are made', () => {
    expect(settingsLink('https://n8n.example.com')).toBe('https://n8n.example.com/settings/api');
    expect(settingsLink('https://n8n.example.com/')).toBe('https://n8n.example.com/settings/api');
    expect(settingsLink('  http://localhost:5678  ')).toBe('http://localhost:5678/settings/api');
  });

  it('keeps a path the instance lives under and drops a query or fragment', () => {
    expect(settingsLink('https://example.com/n8n/?a=1#top')).toBe('https://example.com/n8n/settings/api');
  });

  it('never offers a link for anything that is not a plain web address', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'ftp://host', 'n8n.example.com', '', '   ', 'https://user:pw@n8n.example.com']) {
      expect(settingsLink(value)).toBeNull();
    }
  });

  it('refuses an address that is absurdly long', () => {
    expect(parseAddress(`https://${'a'.repeat(3000)}.example.com`)).toBeNull();
  });
});

describe('requestConnect', () => {
  it('sends the two values as JSON to this site and nothing else', async () => {
    const seen: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      seen.push({ url: String(url), init });
      return new Response(JSON.stringify({ saved: true, diagnosis, notice: null }), { status: 200 });
    };

    await requestConnect('https://n8n.example.com', 'the-key', signal, fetchImpl);

    expect(seen[0]?.url).toBe('/api/connect');
    expect(seen[0]?.init?.method).toBe('POST');
    expect(new Headers(seen[0]?.init?.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(String(seen[0]?.init?.body))).toEqual({ action: 'connect', baseUrl: 'https://n8n.example.com', apiKey: 'the-key' });
    expect(seen[0]?.init?.credentials).toBe('same-origin');
    expect(seen[0]?.init?.referrerPolicy).toBe('no-referrer');
    expect(seen[0]?.init?.cache).toBe('no-store');
  });

  it('sends the choice about version notices only when one is made', async () => {
    const bodies: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      bodies.push(String(init?.body));
      return new Response(JSON.stringify({ saved: true, diagnosis, notice: null }), { status: 200 });
    };

    await requestConnect('a', 'b', signal, fetchImpl);
    await requestConnect('a', 'b', signal, fetchImpl, true);
    await requestConnect('a', 'b', signal, fetchImpl, false);

    expect(JSON.parse(bodies[0] ?? '')).toEqual({ action: 'connect', baseUrl: 'a', apiKey: 'b' });
    expect(JSON.parse(bodies[1] ?? '')).toEqual({ action: 'connect', baseUrl: 'a', apiKey: 'b', checkUpdates: true });
    expect(JSON.parse(bodies[2] ?? '')).toEqual({ action: 'connect', baseUrl: 'a', apiKey: 'b', checkUpdates: false });
  });

  it('returns what the server proved', async () => {
    const result = await requestConnect('a', 'b', signal, respondWith({ saved: true, diagnosis, notice: null }));
    expect(result).toMatchObject({ saved: true, notice: null });
    expect(result.diagnosis.host).toBe('n8n.example.com');
  });

  it('returns a failed check as an answer, not as an error', async () => {
    const failed = { ...diagnosis, ok: false, host: null, workflowCount: null };
    const result = await requestConnect('a', 'b', signal, respondWith({ saved: false, diagnosis: failed, notice: null }));
    expect(result.saved).toBe(false);
  });

  it('names why the server refused and how long to wait', async () => {
    const fetchImpl = respondWith({ error: 'rateLimited', retryAfterSeconds: 3 }, 429);
    await expect(requestConnect('a', 'b', signal, fetchImpl)).rejects.toMatchObject({ code: 'rateLimited', seconds: 3 });
  });

  it('never shows text the server wrote', async () => {
    const fetchImpl = respondWith({ error: 'Too many attempts. Try again in 3 seconds.' }, 429);
    await expect(requestConnect('a', 'b', signal, fetchImpl)).rejects.toMatchObject({ code: 'serverStatus' });
  });

  it('never repeats the key in the message when the server cannot be reached', async () => {
    const offline: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    const error = await requestConnect('https://n8n.example.com', 'SENTINEL-KEY', signal, offline).then(
      () => new Error('it should have failed'),
      (failure: unknown) => failure as Error,
    );
    expect(error).toMatchObject({ code: 'serverSilent' });
    expect(error.message).not.toContain('SENTINEL-KEY');
  });

  it('rejects an answer that does not follow the contract', async () => {
    await expect(requestConnect('a', 'b', signal, respondWith({ saved: 'yes' }))).rejects.toMatchObject({ code: 'invalidAnswer' });
  });
});

describe('requestDisconnect', () => {
  it('asks for the disconnection and reads the answer', async () => {
    const bodies: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      bodies.push(String(init?.body));
      return new Response(JSON.stringify({ disconnected: false, notice: 'processEnv' }), { status: 200 });
    };

    const result = await requestDisconnect(signal, fetchImpl);

    expect(JSON.parse(bodies[0] ?? '')).toEqual({ action: 'disconnect' });
    expect(result).toEqual({ disconnected: false, notice: 'processEnv' });
  });
});
