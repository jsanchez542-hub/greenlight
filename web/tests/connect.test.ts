import type { Diagnosis } from 'greenlight';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readLimitedText } from '@/lib/server/body';
import { MAX_BODY_BYTES, createLimiter, handleConnect, type ConnectContext } from '@/lib/server/connect';
import { guardWrite } from '@/lib/server/guard';
import { RateLimiter } from '@/lib/server/rate-limit';

const KEY = 'SENTINEL-KEY-4f81c0d2';
const ADDRESS = 'https://n8n.example.com';

let folder: string;
let file: string;
let now: number;
let diagnoseCalls: Array<{ baseUrl: string | undefined; apiKey: string | undefined; allowInsecureHttp?: boolean }>;
let passes: boolean;

function diagnosis(ok: boolean, hint = 'Check the address.'): Diagnosis {
  return {
    ok,
    host: ok ? 'n8n.example.com' : null,
    workflowCount: ok ? 4 : null,
    steps: [
      { id: 'address', label: 'The address looks valid', status: 'ok', detail: 'The address is valid.' },
      ok
        ? { id: 'reach', label: 'The instance answers', status: 'ok', detail: 'The instance answered.' }
        : { id: 'reach', label: 'The instance answers', status: 'failed', detail: 'It did not answer.', hint },
    ],
  };
}

function context(overrides: Partial<ConnectContext> = {}): ConnectContext {
  return {
    host: 'localhost:3000',
    lang: 'en',
    env: {},
    processEnv: {},
    filePath: file,
    limiter: createLimiter(() => now),
    diagnose: async (input) => {
      diagnoseCalls.push(input);
      return diagnosis(passes);
    },
    ...overrides,
  };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/connect', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const connectBody = { action: 'connect', baseUrl: ADDRESS, apiKey: KEY };

beforeEach(() => {
  folder = mkdtempSync(path.join(tmpdir(), 'greenlight-connect-'));
  file = path.join(folder, '.env');
  now = 1_000_000;
  diagnoseCalls = [];
  passes = true;
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('who may ask', () => {
  it('refuses a page on another site and writes nothing', async () => {
    const response = await handleConnect(post(connectBody, { 'sec-fetch-site': 'cross-site' }), context());
    expect(response.status).toBe(403);
    expect(existsSync(file)).toBe(false);
    expect(diagnoseCalls).toHaveLength(0);
  });

  it('refuses a request typed into the address bar or sent from a sibling site', async () => {
    for (const site of ['none', 'same-site']) {
      expect((await handleConnect(post(connectBody, { 'sec-fetch-site': site }), context())).status).toBe(403);
    }
  });

  it('refuses a host that is not this machine, which is how rebinding arrives', async () => {
    const response = await handleConnect(post(connectBody), context({ host: 'attacker.example:3000' }));
    expect(response.status).toBe(403);
    expect(existsSync(file)).toBe(false);
  });

  it('refuses a request that proves nothing about where it came from', async () => {
    const request = new Request('http://localhost:3000/api/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(connectBody),
    });
    expect((await handleConnect(request, context())).status).toBe(403);
  });

  it('accepts a browser that sends only an Origin which is exactly this host', async () => {
    const request = new Request('http://localhost:3000/api/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body: JSON.stringify(connectBody),
    });
    expect((await handleConnect(request, context())).status).toBe(200);
  });

  it('refuses an Origin that is another site, another port or another scheme-less string', async () => {
    for (const origin of ['http://attacker.example', 'http://localhost:3001', 'null', 'localhost:3000', 'javascript:alert(1)']) {
      const request = new Request('http://localhost:3000/api/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify(connectBody),
      });
      expect((await handleConnect(request, context())).status).toBe(403);
    }
  });

  it('requires JSON, which a plain form from another site cannot send', async () => {
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data']) {
      const response = await handleConnect(post(JSON.stringify(connectBody), { 'content-type': type }), context());
      expect(response.status).toBe(415);
    }
    expect(existsSync(file)).toBe(false);
  });

  it('accepts JSON with a charset', async () => {
    const response = await handleConnect(post(connectBody, { 'content-type': 'application/json; charset=utf-8' }), context());
    expect(response.status).toBe(200);
  });
});

describe('what it accepts', () => {
  it('refuses a body larger than 8 KB, announced or not', async () => {
    const huge = { ...connectBody, apiKey: 'k'.repeat(MAX_BODY_BYTES) };
    expect((await handleConnect(post(huge), context())).status).toBe(413);

    const sneaky = new Request('http://localhost:3000/api/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"action":"connect","apiKey":"'));
          controller.enqueue(new TextEncoder().encode('k'.repeat(MAX_BODY_BYTES * 2)));
          controller.close();
        },
      }),
      duplex: 'half',
    } as RequestInit);
    expect((await handleConnect(sneaky, context())).status).toBe(413);
    expect(existsSync(file)).toBe(false);
  });

  it('refuses a line break in the key and writes nothing', async () => {
    writeFileSync(file, 'OTHER=1\n');
    const response = await handleConnect(post({ ...connectBody, apiKey: `${KEY}\nN8N_BASE_URL=https://attacker.example` }), context());

    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain(KEY);
    expect(readFileSync(file, 'utf8')).toBe('OTHER=1\n');
    expect(diagnoseCalls).toHaveLength(0);
  });

  it('refuses a control character in the address', async () => {
    const response = await handleConnect(post({ ...connectBody, baseUrl: 'https://n8n.example.com\r\nEVIL=1' }), context());
    expect(response.status).toBe(400);
    expect(existsSync(file)).toBe(false);
  });

  it('cannot be made to write a setting of its own name', async () => {
    const response = await handleConnect(
      post({ ...connectBody, name: 'EVIL', key: 'EVIL', N8N_API_KEY: 'x', GREENLIGHT_WEBHOOK_URL: 'https://attacker.example' }),
      context(),
    );
    expect(response.status).toBe(200);
    expect(readFileSync(file, 'utf8')).toBe(`N8N_BASE_URL=${ADDRESS}\nN8N_API_KEY=${KEY}\n`);
  });

  it('refuses missing, empty, wrongly typed and oversized fields with a plain message', async () => {
    const bad: unknown[] = [
      { action: 'connect' },
      { action: 'connect', baseUrl: '', apiKey: '' },
      { action: 'connect', baseUrl: ADDRESS, apiKey: 42 },
      { action: 'connect', baseUrl: ['a'], apiKey: KEY },
      { action: 'connect', baseUrl: `https://${'a'.repeat(2100)}.example.com`, apiKey: KEY },
      { action: 'connect', baseUrl: ADDRESS, apiKey: 'k'.repeat(2049) },
    ];
    for (const body of bad) {
      const response = await handleConnect(post(body), context());
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: expect.stringMatching(/^(fieldsMissing|fieldsTooLong|notUnderstood)$/) });
    }
    expect(existsSync(file)).toBe(false);
  });

  it('refuses an action it does not know, and anything that is not an object', async () => {
    for (const body of [{ action: 'delete' }, { action: 'connect;disconnect' }, '[]', 'null', '"connect"', 'not json', '']) {
      expect((await handleConnect(post(body), context())).status).toBe(400);
    }
  });
});

describe('connect', () => {
  it('checks the connection first and writes nothing when it fails', async () => {
    passes = false;
    writeFileSync(file, 'OTHER=1\n');

    const response = await handleConnect(post(connectBody), context());
    const answer = await response.json();

    expect(response.status).toBe(200);
    expect(answer.saved).toBe(false);
    expect(answer.diagnosis.ok).toBe(false);
    expect(readFileSync(file, 'utf8')).toBe('OTHER=1\n');
    expect(readdirSync(folder)).toEqual(['.env']);
  });

  it('saves the two settings once the connection works, keeping every other line', async () => {
    writeFileSync(file, '# mine\nGREENLIGHT_SCAN_INTERVAL_MINUTES=10\nN8N_API_KEY=old-key\n');

    const response = await handleConnect(post(connectBody), context());

    expect((await response.json()).saved).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(
      `# mine\nGREENLIGHT_SCAN_INTERVAL_MINUTES=10\nN8N_API_KEY=${KEY}\nN8N_BASE_URL=${ADDRESS}\n`,
    );
    expect(readdirSync(folder)).toEqual(['.env']);
  });

  it.skipIf(process.platform === 'win32')('leaves the file readable by its owner only', async () => {
    await handleConnect(post(connectBody), context());
    expect(lstatSync(file).mode & 0o777).toBe(0o600);
  });

  it('trims what was pasted around the key and the address', async () => {
    await handleConnect(post({ ...connectBody, baseUrl: `  ${ADDRESS}  `, apiKey: ` ${KEY} ` }), context());
    expect(readFileSync(file, 'utf8')).toBe(`N8N_BASE_URL=${ADDRESS}\nN8N_API_KEY=${KEY}\n`);
  });

  it('never returns the key or the path of the file', async () => {
    const response = await handleConnect(post(connectBody), context());
    const text = await response.text();

    expect(text).not.toContain(KEY);
    expect(text).not.toContain(folder);
    expect(text).not.toContain('.env');
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(['diagnosis', 'notice', 'saved']);
  });

  it('removes the key from a diagnosis that echoes it, even though it should not', async () => {
    passes = false;
    const echo = async () => diagnosis(false, `The server said: bad key ${KEY}.`);
    const response = await handleConnect(post(connectBody), context({ diagnose: echo }));
    expect(await response.text()).not.toContain(KEY);
  });

  it('writes nothing to the console or the log, whatever happens', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));

    await handleConnect(post(connectBody), context());
    passes = false;
    now += 5_000;
    await handleConnect(post(connectBody), context());
    await handleConnect(post({ ...connectBody, apiKey: `${KEY}\n` }), context());

    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(KEY);
    }
  });

  it('passes the operator choice about plain http to the check', async () => {
    await handleConnect(post(connectBody), context({ env: { GREENLIGHT_ALLOW_INSECURE_HTTP: '1' } }));
    expect(diagnoseCalls[0]?.allowInsecureHttp).toBe(true);
  });

  it('warns when the program environment will override what was saved', async () => {
    const response = await handleConnect(post(connectBody), context({ processEnv: { N8N_API_KEY: 'from-the-environment' } }));
    const answer = await response.json();

    expect(answer.saved).toBe(true);
    expect(answer.notice).toBe('processEnv');
    expect(JSON.stringify(answer)).not.toContain('from-the-environment');
  });

  it.skipIf(process.platform === 'win32' && !canLink())('refuses a settings file that is a symbolic link and writes through nothing', async () => {
    const target = path.join(folder, 'elsewhere.txt');
    writeFileSync(target, 'UNTOUCHED=1\n');
    symlinkSync(target, file);

    const response = await handleConnect(post(connectBody), context());
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toEqual({ error: 'envSymlink' });
    expect(text).not.toContain(folder);
    expect(readFileSync(target, 'utf8')).toBe('UNTOUCHED=1\n');
  });

  it('survives two connections at the same moment', async () => {
    const limiter = new RateLimiter({ minGapMs: 0, maxPerWindow: 100, windowMs: 60_000, now: () => now });
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        handleConnect(post({ ...connectBody, baseUrl: `https://host-${index}.example.com`, apiKey: `key-${index}` }), context({ limiter })),
      ),
    );

    const text = readFileSync(file, 'utf8');
    expect(text.match(/^N8N_BASE_URL=/gm)).toHaveLength(1);
    expect(text.match(/^N8N_API_KEY=/gm)).toHaveLength(1);
    expect(text.match(/host-(\d)/)?.[1]).toBe(text.match(/key-(\d)/)?.[1]);
  });
});

function canLink(): boolean {
  const probe = mkdtempSync(path.join(tmpdir(), 'greenlight-link-'));
  try {
    writeFileSync(path.join(probe, 'target'), '');
    symlinkSync(path.join(probe, 'target'), path.join(probe, 'link'));
    return true;
  } catch {
    return false;
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
}

describe('the notice of new versions in the same request', () => {
  it('is written with the connection when the box is ticked', async () => {
    writeFileSync(file, '# mine\n');
    const response = await handleConnect(post({ ...connectBody, checkUpdates: true }), context());

    expect((await response.json()).saved).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(`# mine\nN8N_BASE_URL=${ADDRESS}\nN8N_API_KEY=${KEY}\nGREENLIGHT_CHECK_UPDATES=1\n`);
  });

  it('is written as 0 when the box is not ticked', async () => {
    await handleConnect(post({ ...connectBody, checkUpdates: false }), context());
    expect(readFileSync(file, 'utf8')).toBe(`N8N_BASE_URL=${ADDRESS}\nN8N_API_KEY=${KEY}\nGREENLIGHT_CHECK_UPDATES=0\n`);
  });

  it('is left alone when the request does not mention it', async () => {
    writeFileSync(file, 'GREENLIGHT_CHECK_UPDATES=1\n');
    await handleConnect(post(connectBody), context());
    expect(readFileSync(file, 'utf8')).toBe(`GREENLIGHT_CHECK_UPDATES=1\nN8N_BASE_URL=${ADDRESS}\nN8N_API_KEY=${KEY}\n`);
  });

  it('is refused unless it is a real boolean, and then nothing is written', async () => {
    for (const checkUpdates of ['yes', 1, null, [], {}]) {
      const response = await handleConnect(post({ ...connectBody, checkUpdates }), context());
      expect(response.status).toBe(400);
    }
    expect(existsSync(file)).toBe(false);
  });

  it('is not written when the connection fails', async () => {
    passes = false;
    await handleConnect(post({ ...connectBody, checkUpdates: true }), context());
    expect(existsSync(file)).toBe(false);
  });

  it('is kept when the connection is removed, because it is not part of the connection', async () => {
    writeFileSync(file, `N8N_BASE_URL=${ADDRESS}\nN8N_API_KEY=${KEY}\nGREENLIGHT_CHECK_UPDATES=1\n`);
    await handleConnect(post({ action: 'disconnect' }), context());
    expect(readFileSync(file, 'utf8')).toBe('GREENLIGHT_CHECK_UPDATES=1\n');
  });
});

describe('disconnect', () => {
  it('removes the two settings and keeps the rest', async () => {
    writeFileSync(file, `# mine\nN8N_BASE_URL=${ADDRESS}\nOTHER=1\nN8N_API_KEY=${KEY}\n`);

    const response = await handleConnect(post({ action: 'disconnect' }), context());

    expect(await response.json()).toEqual({ disconnected: true, notice: null });
    expect(readFileSync(file, 'utf8')).toBe('# mine\nOTHER=1\n');
  });

  it('is harmless when nothing was saved', async () => {
    const response = await handleConnect(post({ action: 'disconnect' }), context());
    expect(response.status).toBe(200);
    expect(existsSync(file)).toBe(false);
  });

  it('says plainly when the values come from the environment of the program and not from the file', async () => {
    writeFileSync(file, `N8N_API_KEY=${KEY}\n`);

    const response = await handleConnect(post({ action: 'disconnect' }), context({ processEnv: { N8N_BASE_URL: 'https://n8n.example.com' } }));
    const answer = await response.json();

    expect(answer.disconnected).toBe(false);
    expect(answer.notice).toBe('processEnv');
    expect(readFileSync(file, 'utf8')).toBe('');
  });

  it('is guarded exactly like connecting', async () => {
    expect((await handleConnect(post({ action: 'disconnect' }, { 'sec-fetch-site': 'cross-site' }), context())).status).toBe(403);
    expect((await handleConnect(post({ action: 'disconnect' }), context({ host: 'attacker.example' }))).status).toBe(403);
    expect((await handleConnect(post({ action: 'disconnect' }, { 'content-type': 'text/plain' }), context())).status).toBe(415);
  });
});

describe('how often', () => {
  it('allows one attempt per second and answers 429 with Retry-After when pushed', async () => {
    const shared = createLimiter(() => now);
    expect((await handleConnect(post(connectBody), context({ limiter: shared }))).status).toBe(200);

    const refused = await handleConnect(post(connectBody), context({ limiter: shared }));

    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toBe('1');
    expect(await refused.json()).toEqual({ error: 'rateLimited', retryAfterSeconds: 1 });
    expect(diagnoseCalls).toHaveLength(1);

    now += 1_000;
    expect((await handleConnect(post(connectBody), context({ limiter: shared }))).status).toBe(200);
  });

  it('stops at twenty attempts a minute and says how long to wait', async () => {
    const shared = createLimiter(() => now);
    passes = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect((await handleConnect(post(connectBody), context({ limiter: shared }))).status).toBe(200);
      now += 1_000;
    }

    const refused = await handleConnect(post(connectBody), context({ limiter: shared }));

    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(30);
    expect(diagnoseCalls).toHaveLength(20);
  });

  it('is not spent by a request that was refused for who sent it', async () => {
    const shared = createLimiter(() => now);
    await handleConnect(post(connectBody, { 'sec-fetch-site': 'cross-site' }), context({ limiter: shared }));
    expect((await handleConnect(post(connectBody), context({ limiter: shared }))).status).toBe(200);
  });
});

describe('guardWrite', () => {
  const facts = { method: 'POST', host: 'localhost:3000', fetchSite: 'same-origin', origin: null };

  it('lets the dashboard through and nothing else', () => {
    expect(guardWrite(facts, {})).toEqual({ allowed: true });
    expect(guardWrite({ ...facts, fetchSite: 'cross-site' }, {})).toMatchObject({ allowed: false, status: 403 });
    expect(guardWrite({ ...facts, fetchSite: null }, {})).toMatchObject({ allowed: false });
    expect(guardWrite({ ...facts, host: null }, {})).toMatchObject({ allowed: false });
  });

  it('compares the origin with the host without caring about case', () => {
    expect(guardWrite({ ...facts, fetchSite: null, origin: 'http://LOCALHOST:3000' }, {})).toEqual({ allowed: true });
  });
});

describe('readLimitedText', () => {
  it('returns what fits', async () => {
    const request = new Request('http://localhost/x', { method: 'POST', body: 'hello' });
    expect(await readLimitedText(request, 100)).toEqual({ ok: true, text: 'hello' });
  });

  it('gives up on what does not', async () => {
    const request = new Request('http://localhost/x', { method: 'POST', body: 'x'.repeat(101) });
    expect(await readLimitedText(request, 100)).toEqual({ ok: false });
  });

  it('treats a missing body as empty', async () => {
    expect(await readLimitedText(new Request('http://localhost/x', { method: 'POST' }), 100)).toEqual({ ok: true, text: '' });
  });
});

describe('RateLimiter', () => {
  it('forgets attempts once the window has passed', () => {
    let clock = 0;
    const limiter = new RateLimiter({ minGapMs: 0, maxPerWindow: 2, windowMs: 1000, now: () => clock });

    expect(limiter.check().allowed).toBe(true);
    expect(limiter.check().allowed).toBe(true);
    expect(limiter.check()).toEqual({ allowed: false, retryAfterSeconds: 1 });
    clock = 1000;
    expect(limiter.check().allowed).toBe(true);
  });
});
