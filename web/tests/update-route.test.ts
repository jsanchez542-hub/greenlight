import { VERSION } from 'greenlight';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ host: 'localhost:3000' as string | null }));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(state.host === null ? {} : { host: state.host }),
  cookies: async () => ({ get: () => undefined }),
}));

let route: typeof import('@/app/api/update/route');

const holder = globalThis as typeof globalThis & { greenlightUpdateCache?: unknown; greenlightUpdatePending?: unknown };

let folder: string;
let file: string;
let outgoing: ReturnType<typeof vi.fn>;

function request(method: string, fetchSite: string | null = 'same-origin', body?: unknown): Request {
  return new Request('http://localhost:3000/api/update', {
    method,
    headers: {
      ...(fetchSite === null ? {} : { 'sec-fetch-site': fetchSite }),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function githubSays(tag: string): void {
  outgoing.mockImplementation(async () => new Response(JSON.stringify({ tag_name: tag }), { status: 200 }));
}

beforeEach(async () => {
  vi.resetModules();
  route = await import('@/app/api/update/route');
  folder = mkdtempSync(path.join(tmpdir(), 'greenlight-update-route-'));
  file = path.join(folder, '.env');
  vi.stubEnv('GREENLIGHT_ENV_FILE', file);
  state.host = 'localhost:3000';
  holder.greenlightUpdateCache = undefined;
  holder.greenlightUpdatePending = undefined;
  outgoing = vi.fn(async () => {
    throw new Error('nothing should be requested');
  });
  vi.stubGlobal('fetch', outgoing);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  rmSync(folder, { recursive: true, force: true });
});

describe('GET /api/update', () => {
  it('answers that the notice is off and makes no outgoing request when it was never turned on', async () => {
    const response = await route.GET(request('GET'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ enabled: false, chosen: false });
    expect(outgoing).not.toHaveBeenCalled();
  });

  it('makes no outgoing request when it was turned off on purpose', async () => {
    writeFileSync(file, 'GREENLIGHT_CHECK_UPDATES=0\n');
    expect(await (await route.GET(request('GET'))).json()).toEqual({ enabled: false, chosen: true });
    expect(outgoing).not.toHaveBeenCalled();
  });

  it('reports a newer version once it is turned on', async () => {
    writeFileSync(file, 'GREENLIGHT_CHECK_UPDATES=1\n');
    githubSays('v9.9.9');

    const answer = await (await route.GET(request('GET'))).json();

    expect(answer).toEqual({
      enabled: true,
      current: VERSION,
      latest: '9.9.9',
      url: 'https://github.com/jsanchez542-hub/greenlight/releases/tag/v9.9.9',
    });
    expect(outgoing).toHaveBeenCalledTimes(1);
  });

  it('reports nothing newer when the version is the same', async () => {
    writeFileSync(file, 'GREENLIGHT_CHECK_UPDATES=1\n');
    githubSays(`v${VERSION}`);
    expect(await (await route.GET(request('GET'))).json()).toEqual({ enabled: true, current: VERSION, latest: null, url: null });
  });

  it('answers 200 with nothing to report, not an error, when the network is down', async () => {
    writeFileSync(file, 'GREENLIGHT_CHECK_UPDATES=1\n');
    const response = await route.GET(request('GET'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enabled: true, current: VERSION, latest: null, url: null });
  });

  it('asks GitHub once a day however many pages are open', async () => {
    writeFileSync(file, 'GREENLIGHT_CHECK_UPDATES=1\n');
    githubSays('v9.9.9');
    await Promise.all([route.GET(request('GET')), route.GET(request('GET'))]);
    await route.GET(request('GET'));
    expect(outgoing).toHaveBeenCalledTimes(1);
  });

  it('applies the same host and site defences as every route', async () => {
    writeFileSync(file, 'GREENLIGHT_CHECK_UPDATES=1\n');
    githubSays('v9.9.9');
    state.host = 'attacker.example';
    expect((await route.GET(request('GET'))).status).toBe(403);
    state.host = 'localhost:3000';
    expect((await route.GET(request('GET', 'cross-site'))).status).toBe(403);
    expect(outgoing).not.toHaveBeenCalled();
  });

  it('does not let a page hammer it', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 70; attempt += 1) {
      statuses.push((await route.GET(request('GET'))).status);
    }
    expect(statuses.slice(0, 60).every((status) => status === 200)).toBe(true);
    expect(statuses.slice(60)).toContain(429);
    expect(outgoing).not.toHaveBeenCalled();
  });
});

describe('POST /api/update', () => {
  it('turns the notice on in the settings file and the next read sees it', async () => {
    const response = await route.POST(request('POST', 'same-origin', { enabled: true }));
    expect(response.status).toBe(200);
    expect(readFileSync(file, 'utf8')).toBe('GREENLIGHT_CHECK_UPDATES=1\n');

    githubSays('v9.9.9');
    expect(await (await route.GET(request('GET'))).json()).toMatchObject({ enabled: true, latest: '9.9.9' });
  });

  it('refuses another site, another host and a bare script, and writes nothing', async () => {
    expect((await route.POST(request('POST', 'cross-site', { enabled: true }))).status).toBe(403);
    expect((await route.POST(request('POST', null, { enabled: true }))).status).toBe(403);
    state.host = 'attacker.example';
    expect((await route.POST(request('POST', 'same-origin', { enabled: true }))).status).toBe(403);
    expect(() => readFileSync(file, 'utf8')).toThrow();
  });

  it('refuses a value that is not a boolean', async () => {
    expect((await route.POST(request('POST', 'same-origin', { enabled: 'true' }))).status).toBe(400);
    expect(() => readFileSync(file, 'utf8')).toThrow();
  });

  it('answers 405 to every other method', () => {
    for (const handler of [route.PUT, route.PATCH, route.DELETE, route.HEAD]) {
      const response = handler();
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET, POST, OPTIONS');
    }
    expect(route.OPTIONS().headers.get('access-control-allow-origin')).toBeNull();
  });
});
