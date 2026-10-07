import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleResult } from '@/lib/sample';
import { EnvFileError } from '@/lib/server/environment';
import { ScanCache } from '@/lib/server/scan-cache';

const state = vi.hoisted(() => ({
  host: 'localhost:3000' as string | null,
  env: {} as Record<string, string | undefined>,
  problem: null as Error | null,
  now: 1_000_000,
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(state.host === null ? {} : { host: state.host }),
}));

vi.mock('@/lib/server/environment', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/server/environment')>();
  return {
    ...original,
    currentEnvironment: () => {
      if (state.problem !== null) {
        throw state.problem;
      }
      return state.env;
    },
  };
});

let cache: ScanCache;
vi.mock('@/lib/server/live-scan', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/server/live-scan')>();
  return { ...original, liveCache: () => cache };
});

const scan = await import('@/app/api/scan/route');
const setup = await import('@/app/api/setup/route');

const configured = { N8N_BASE_URL: 'https://n8n.example.com', N8N_API_KEY: 'sentinel-key-123' };

function request(method: string, fetchSite?: string): Request {
  return new Request('http://localhost:3000/api/scan', {
    method,
    headers: fetchSite === undefined ? {} : { 'sec-fetch-site': fetchSite },
  });
}

beforeEach(() => {
  state.host = 'localhost:3000';
  state.env = { ...configured };
  state.problem = null;
  state.now = 1_000_000;
  cache = new ScanCache({
    scan: async () => sampleResult,
    describeFailure: () => 'failed',
    intervalMinutes: 5,
    host: 'n8n.example.com',
    now: () => state.now,
  });
});

describe('GET /api/scan', () => {
  it('serves the stored scan with no-store', async () => {
    const response = await scan.GET(request('GET', 'same-origin'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ host: 'n8n.example.com', intervalMinutes: 5 });
  });

  it('answers a foreign Host with 403 before saying anything about the settings', async () => {
    state.host = 'attacker.example';
    state.env = {};

    const response = await scan.GET(request('GET', 'same-origin'));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'This host is not allowed. Open the dashboard through localhost.' });
  });

  it('refuses a page on another site', async () => {
    expect((await scan.GET(request('GET', 'cross-site'))).status).toBe(403);
  });

  it('is not found when no instance is configured', async () => {
    state.env = {};
    expect((await scan.GET(request('GET', 'same-origin'))).status).toBe(404);
  });

  it('is not found when the address would send the key to an unsafe place', async () => {
    state.env = { ...configured, N8N_BASE_URL: 'https://user:pass@n8n.example.com' };
    expect((await scan.GET(request('GET', 'same-origin'))).status).toBe(404);
  });

  it('turns an unreadable settings file into a readable 500 that names no path', async () => {
    state.problem = new EnvFileError('The .env file cannot be read (EACCES).');

    const response = await scan.GET(request('GET', 'same-origin'));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toContain('cannot be read (EACCES)');
    expect(text).not.toMatch(/[A-Za-z]:\\|\/home\/|\/Users\//);
  });

  it('never contains the API key', async () => {
    const response = await scan.GET(request('GET', 'same-origin'));
    expect(await response.text()).not.toContain('sentinel-key-123');
  });
});

describe('POST /api/scan', () => {
  it('starts a refresh and answers 202', async () => {
    const response = await scan.POST(request('POST', 'same-origin'));
    expect(response.status).toBe(202);
    expect((await response.json()).refreshing).toBe(true);
  });

  it('answers 429 with Retry-After when asked again too soon', async () => {
    await scan.POST(request('POST', 'same-origin'));
    await cache.refresh();
    state.now += 12_000;

    const response = await scan.POST(request('POST', 'same-origin'));

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('18');
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('18 seconds') });
  });

  it('refuses a request from another site and one typed into the address bar', async () => {
    expect((await scan.POST(request('POST', 'cross-site'))).status).toBe(403);
    expect((await scan.POST(request('POST', 'none'))).status).toBe(403);
  });

  it('refuses a foreign Host', async () => {
    state.host = 'rebind.example:3000';
    expect((await scan.POST(request('POST', 'same-origin'))).status).toBe(403);
  });
});

describe('GET /api/setup', () => {
  it('applies the same host and site defences', async () => {
    state.host = 'attacker.example';
    expect((await setup.GET(request('GET', 'same-origin'))).status).toBe(403);
    state.host = 'localhost:3000';
    expect((await setup.GET(request('GET', 'cross-site'))).status).toBe(403);
  });

  it('answers with no-store and without the key', async () => {
    state.env = {};
    const response = await setup.GET(request('GET', 'same-origin'));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(JSON.parse(text)).toMatchObject({ hasAddress: false, hasKey: false });
  });
});

describe('methods', () => {
  it('answers every method a route does not offer with 405 and an Allow header', async () => {
    for (const handler of [scan.PUT, scan.PATCH, scan.DELETE, scan.HEAD]) {
      const response = handler();
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET, POST, OPTIONS');
    }
    for (const handler of [setup.POST, setup.PUT, setup.PATCH, setup.DELETE, setup.HEAD]) {
      const response = handler();
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET, OPTIONS');
    }
  });

  it('answers OPTIONS without any cross-origin permission', () => {
    const response = scan.OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get('allow')).toBe('GET, POST, OPTIONS');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
