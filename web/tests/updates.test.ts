import { VERSION } from 'greenlight';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLimiter } from '@/lib/server/connect';
import { MemoryUpdateCache } from 'greenlight';
import { handleUpdateChoice, readUpdates, type UpdateChoiceContext } from '@/lib/server/updates';

const NEWER = '9.9.9';
const RELEASE = `https://github.com/jsanchez542-hub/greenlight/releases/tag/v${NEWER}`;

function release(tag: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify({ tag_name: tag }), { status: 200 })) as unknown as typeof fetch;
}

const on = { GREENLIGHT_CHECK_UPDATES: '1' };

describe('readUpdates', () => {
  it('makes no request at all while the notice is off', async () => {
    const spy = release(`v${NEWER}`);
    for (const env of [{}, { GREENLIGHT_CHECK_UPDATES: '0' }, { GREENLIGHT_CHECK_UPDATES: 'no' }, { GREENLIGHT_CHECK_UPDATES: '' }]) {
      await readUpdates(env, { fetch: spy, cache: new MemoryUpdateCache() });
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('says whether the person ever chose, so the form can respect an explicit no', async () => {
    expect(await readUpdates({})).toEqual({ enabled: false, chosen: false });
    expect(await readUpdates({ GREENLIGHT_CHECK_UPDATES: '0' })).toEqual({ enabled: false, chosen: true });
    expect(await readUpdates({ GREENLIGHT_CHECK_UPDATES: '  ' })).toEqual({ enabled: false, chosen: false });
  });

  it('reports a newer version with the address of its page, built from the number', async () => {
    const answer = await readUpdates(on, { fetch: release(`v${NEWER}`), cache: new MemoryUpdateCache() });
    expect(answer).toEqual({ enabled: true, current: VERSION, latest: NEWER, url: RELEASE });
  });

  it('has nothing to say when the version is the same, older or not a plain number', async () => {
    for (const tag of [`v${VERSION}`, '0.0.1', '1.0.0-beta.1', 'latest', '<img src=x onerror=alert(1)>', 42, null]) {
      const answer = await readUpdates(on, { fetch: release(tag), cache: new MemoryUpdateCache() });
      expect(answer).toEqual({ enabled: true, current: VERSION, latest: null, url: null });
    }
  });

  it('does not take the address from the answer of GitHub', async () => {
    const hostile = vi.fn(
      async () =>
        new Response(JSON.stringify({ tag_name: `v${NEWER}`, html_url: 'https://evil.example/phish' }), { status: 200 }),
    ) as unknown as typeof fetch;
    const answer = await readUpdates(on, { fetch: hostile, cache: new MemoryUpdateCache() });
    expect(JSON.stringify(answer)).not.toContain('evil.example');
  });

  it('says nothing when the network fails, without an error', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    expect(await readUpdates(on, { fetch: down, cache: new MemoryUpdateCache() })).toEqual({
      enabled: true,
      current: VERSION,
      latest: null,
      url: null,
    });
  });

  it('says nothing when GitHub answers with an error status', async () => {
    const refused = vi.fn(async () => new Response('{}', { status: 403 })) as unknown as typeof fetch;
    expect((await readUpdates(on, { fetch: refused, cache: new MemoryUpdateCache() }))).toMatchObject({ latest: null });
  });

  it('asks once and then answers from memory', async () => {
    const spy = release(`v${NEWER}`);
    const cache = new MemoryUpdateCache();
    await readUpdates(on, { fetch: spy, cache });
    await readUpdates(on, { fetch: spy, cache });
    await readUpdates(on, { fetch: spy, cache });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('sends nothing about the person, the instance or the settings', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ tag_name: `v${NEWER}` }), { status: 200 }));
    const env = {
      ...on,
      N8N_BASE_URL: 'https://secret-instance.internal.test',
      N8N_API_KEY: 'SENTINEL-KEY-31ab',
      GREENLIGHT_WEBHOOK_TOKEN: 'SENTINEL-TOKEN',
    };
    await readUpdates(env, { fetch: spy as unknown as typeof fetch, cache: new MemoryUpdateCache() });

    const [target, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.stringify({ target, init });
    expect(target).toBe('https://api.github.com/repos/jsanchez542-hub/greenlight/releases/latest');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(Object.keys(init.headers as Record<string, string>).sort()).toEqual(['accept', 'user-agent', 'x-github-api-version']);
    for (const secret of ['secret-instance', 'SENTINEL-KEY', 'SENTINEL-TOKEN', 'n8n']) {
      expect(sent).not.toContain(secret);
    }
  });
});

describe('handleUpdateChoice', () => {
  let folder: string;
  let file: string;
  let now: number;

  beforeEach(() => {
    folder = mkdtempSync(path.join(tmpdir(), 'greenlight-updates-'));
    file = path.join(folder, '.env');
    now = 1_000_000;
  });

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  function context(overrides: Partial<UpdateChoiceContext> = {}): UpdateChoiceContext {
    return { host: 'localhost:3000', env: {}, processEnv: {}, filePath: file, limiter: createLimiter(() => now), ...overrides };
  }

  function post(body: unknown, headers: Record<string, string> = {}): Request {
    return new Request('http://localhost:3000/api/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('turns the notice on and keeps every other line', async () => {
    writeFileSync(file, '# mine\nN8N_BASE_URL=https://n8n.example.com\nOTHER=1\n');
    const response = await handleUpdateChoice(post({ enabled: true }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enabled: true, notice: null });
    expect(readFileSync(file, 'utf8')).toBe('# mine\nN8N_BASE_URL=https://n8n.example.com\nOTHER=1\nGREENLIGHT_CHECK_UPDATES=1\n');
  });

  it('turns it off by writing 0, which is a choice and not an absence', async () => {
    writeFileSync(file, 'GREENLIGHT_CHECK_UPDATES=1\n');
    await handleUpdateChoice(post({ enabled: false }), context());
    expect(readFileSync(file, 'utf8')).toBe('GREENLIGHT_CHECK_UPDATES=0\n');
  });

  it('creates the file when there is none and writes nothing but that line', async () => {
    await handleUpdateChoice(post({ enabled: true }), context());
    expect(readFileSync(file, 'utf8')).toBe('GREENLIGHT_CHECK_UPDATES=1\n');
  });

  it('refuses a page on another site, a foreign host and a request that proves nothing', async () => {
    expect((await handleUpdateChoice(post({ enabled: true }, { 'sec-fetch-site': 'cross-site' }), context())).status).toBe(403);
    expect((await handleUpdateChoice(post({ enabled: true }), context({ host: 'attacker.example' }))).status).toBe(403);
    const bare = new Request('http://localhost:3000/api/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    expect((await handleUpdateChoice(bare, context())).status).toBe(403);
    expect(existsSync(file)).toBe(false);
  });

  it('refuses an Origin that is not this host', async () => {
    const request = new Request('http://localhost:3000/api/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://attacker.example' },
      body: JSON.stringify({ enabled: true }),
    });
    expect((await handleUpdateChoice(request, context())).status).toBe(403);
    expect(existsSync(file)).toBe(false);
  });

  it('requires JSON', async () => {
    const response = await handleUpdateChoice(post(JSON.stringify({ enabled: true }), { 'content-type': 'text/plain' }), context());
    expect(response.status).toBe(415);
    expect(existsSync(file)).toBe(false);
  });

  it('validates the type: only a real boolean is a choice', async () => {
    for (const body of [{ enabled: 'true' }, { enabled: 1 }, { enabled: null }, {}, [], '"yes"', 'null', 'not json', '']) {
      const response = await handleUpdateChoice(post(body), context());
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect(await response.json()).toEqual({ error: 'notUnderstood' });
    }
    expect(existsSync(file)).toBe(false);
  });

  it('refuses a body larger than 1 KB', async () => {
    const response = await handleUpdateChoice(post({ enabled: true, padding: 'x'.repeat(2000) }), context());
    expect(response.status).toBe(413);
  });

  it('writes only the setting it is for, whatever else is in the request', async () => {
    writeFileSync(file, 'N8N_API_KEY=keep-me\n');
    await handleUpdateChoice(post({ enabled: true, N8N_API_KEY: 'x', N8N_BASE_URL: 'https://evil.example', name: 'EVIL' }), context());
    expect(readFileSync(file, 'utf8')).toBe('N8N_API_KEY=keep-me\nGREENLIGHT_CHECK_UPDATES=1\n');
  });

  it('allows one change a second and says how long to wait', async () => {
    const shared = createLimiter(() => now);
    expect((await handleUpdateChoice(post({ enabled: true }), context({ limiter: shared }))).status).toBe(200);
    const refused = await handleUpdateChoice(post({ enabled: false }), context({ limiter: shared }));
    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toBe('1');
    expect(await refused.json()).toEqual({ error: 'rateLimited', retryAfterSeconds: 1 });
  });

  it('says when the program environment will override the file', async () => {
    const response = await handleUpdateChoice(post({ enabled: true }), context({ processEnv: { GREENLIGHT_CHECK_UPDATES: '0' } }));
    expect(await response.json()).toEqual({ enabled: true, notice: 'processEnv' });
  });

  it('names the problem and not the path when the file cannot be written', async () => {
    const failing = context({
      save: async () => {
        throw new Error(`EACCES: ${file}`);
      },
    });
    const response = await handleUpdateChoice(post({ enabled: true }), failing);
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ error: 'saveFailed' });
    expect(text).not.toContain(folder);
  });
});
