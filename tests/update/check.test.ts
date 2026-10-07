import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FileUpdateCache,
  MemoryUpdateCache,
  checkForUpdate,
  fetchLatestVersion,
  isNewer,
  parseVersion,
  releaseUrl,
  updateChecksEnabled,
} from '../../src/update/check.js';

function release(tag: unknown, init: ResponseInit = {}): typeof globalThis.fetch {
  return (async () => new Response(JSON.stringify({ tag_name: tag, html_url: 'https://evil.example/x' }), init)) as typeof globalThis.fetch;
}

describe('updateChecksEnabled', () => {
  it('is off unless the setting is 1 or true', () => {
    expect(updateChecksEnabled({})).toBe(false);
    expect(updateChecksEnabled({ GREENLIGHT_CHECK_UPDATES: '' })).toBe(false);
    expect(updateChecksEnabled({ GREENLIGHT_CHECK_UPDATES: '0' })).toBe(false);
    expect(updateChecksEnabled({ GREENLIGHT_CHECK_UPDATES: 'yes' })).toBe(false);
    expect(updateChecksEnabled({ GREENLIGHT_CHECK_UPDATES: '1' })).toBe(true);
    expect(updateChecksEnabled({ GREENLIGHT_CHECK_UPDATES: ' TRUE ' })).toBe(true);
  });
});

describe('versions', () => {
  it('reads release tags and nothing else', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersion('1.2.3-beta.1')).toBeNull();
    expect(parseVersion('latest')).toBeNull();
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion('v1.2.3; rm -rf /')).toBeNull();
    expect(parseVersion(12)).toBeNull();
  });

  it('compares numerically, not as text', () => {
    expect(isNewer('1.0.1', '1.0.0')).toBe(true);
    expect(isNewer('1.10.0', '1.9.0')).toBe(true);
    expect(isNewer('2.0.0', '1.99.99')).toBe(true);
    expect(isNewer('1.0.0', '1.0.0')).toBe(false);
    expect(isNewer('0.9.0', '1.0.0')).toBe(false);
    expect(isNewer('garbage', '1.0.0')).toBe(false);
  });

  it('builds the release address itself from the version', () => {
    expect(releaseUrl('1.2.3')).toBe('https://github.com/jsanchez542-hub/greenlight/releases/tag/v1.2.3');
    expect(releaseUrl('v1.2.3')).toBe('https://github.com/jsanchez542-hub/greenlight/releases/tag/v1.2.3');
  });
});

describe('fetchLatestVersion', () => {
  it('asks for the number of the latest release, and sends nothing about the person', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const spy = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ tag_name: 'v1.4.0' }));
    }) as unknown as typeof globalThis.fetch;

    expect(await fetchLatestVersion({ current: '1.0.0', fetch: spy })).toBe('1.4.0');

    const request = seen as unknown as { url: string; init: RequestInit };
    expect(request.url).toBe('https://api.github.com/repos/jsanchez542-hub/greenlight/releases/latest');
    expect(request.init.method).toBe('GET');
    expect(request.init.body).toBeUndefined();
    expect(request.init.redirect).toBe('error');
    expect(Object.keys(request.init.headers as object).sort()).toEqual(['accept', 'user-agent', 'x-github-api-version']);
    expect((request.init.headers as Record<string, string>)['user-agent']).toBe('greenlight/1.0.0');
  });

  it('answers nothing, quietly, for every kind of failure', async () => {
    const failing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof globalThis.fetch;

    expect(await fetchLatestVersion({ current: '1.0.0', fetch: failing })).toBeNull();
    expect(await fetchLatestVersion({ current: '1.0.0', fetch: release('v2.0.0', { status: 404 }) })).toBeNull();
    expect(await fetchLatestVersion({ current: '1.0.0', fetch: release('v2.0.0', { status: 403 }) })).toBeNull();
    expect(await fetchLatestVersion({ current: '1.0.0', fetch: release('2.0.0-rc.1') })).toBeNull();
    expect(await fetchLatestVersion({ current: '1.0.0', fetch: release(null) })).toBeNull();
    const notJson = (async () => new Response('<html>')) as unknown as typeof globalThis.fetch;
    expect(await fetchLatestVersion({ current: '1.0.0', fetch: notJson })).toBeNull();
    const huge = (async () => new Response('x'.repeat(300_000))) as unknown as typeof globalThis.fetch;
    expect(await fetchLatestVersion({ current: '1.0.0', fetch: huge })).toBeNull();
  });
});

describe('checkForUpdate', () => {
  it('reports a newer version with an address that did not come from the response', async () => {
    const update = await checkForUpdate({ current: '1.0.0', fetch: release('v1.1.0'), cache: new MemoryUpdateCache() });

    expect(update).toEqual({
      current: '1.0.0',
      latest: '1.1.0',
      url: 'https://github.com/jsanchez542-hub/greenlight/releases/tag/v1.1.0',
    });
  });

  it('stays quiet when the version is the same, older, or cannot be told', async () => {
    expect(await checkForUpdate({ current: '1.1.0', fetch: release('v1.1.0'), cache: new MemoryUpdateCache() })).toBeNull();
    expect(await checkForUpdate({ current: '2.0.0', fetch: release('v1.1.0'), cache: new MemoryUpdateCache() })).toBeNull();
    expect(await checkForUpdate({ current: '1.0.0', fetch: release('nonsense'), cache: new MemoryUpdateCache() })).toBeNull();
  });

  it('asks at most once a day, including after a failure', async () => {
    let calls = 0;
    const counting = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ tag_name: 'v1.1.0' }));
    }) as unknown as typeof globalThis.fetch;
    const cache = new MemoryUpdateCache();
    let now = 1_000_000;

    await checkForUpdate({ current: '1.0.0', fetch: counting, cache, now: () => now });
    now += 60 * 60 * 1000;
    const again = await checkForUpdate({ current: '1.0.0', fetch: counting, cache, now: () => now });
    expect(calls).toBe(1);
    expect(again?.latest).toBe('1.1.0');

    now += 24 * 60 * 60 * 1000;
    await checkForUpdate({ current: '1.0.0', fetch: counting, cache, now: () => now });
    expect(calls).toBe(2);

    let failures = 0;
    const failing = (async () => {
      failures += 1;
      throw new Error('offline');
    }) as unknown as typeof globalThis.fetch;
    const failedCache = new MemoryUpdateCache();
    await checkForUpdate({ current: '1.0.0', fetch: failing, cache: failedCache, now: () => now });
    await checkForUpdate({ current: '1.0.0', fetch: failing, cache: failedCache, now: () => now });
    expect(failures).toBe(1);
  });

  it('does not trust a clock that went backwards', async () => {
    let calls = 0;
    const counting = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ tag_name: 'v1.1.0' }));
    }) as unknown as typeof globalThis.fetch;
    const cache = new MemoryUpdateCache();
    cache.write({ checkedAt: 9_000_000, latest: '1.1.0' });

    await checkForUpdate({ current: '1.0.0', fetch: counting, cache, now: () => 1_000 });

    expect(calls).toBe(1);
  });
});

describe('FileUpdateCache', () => {
  it('remembers an answer, tolerates a damaged file, and never lets a hostile value through', () => {
    const folder = mkdtempSync(join(tmpdir(), 'greenlight-update-'));
    try {
      const path = join(folder, 'update.json');
      const cache = new FileUpdateCache(path);

      expect(cache.read()).toBeNull();
      cache.write({ checkedAt: 5, latest: '1.2.0' });
      expect(cache.read()).toEqual({ checkedAt: 5, latest: '1.2.0' });
      expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ checkedAt: 5, latest: '1.2.0' });
      if (process.platform !== 'win32') {
        expect(statSync(path).mode & 0o077).toBe(0);
      }

      writeFileSync(path, '{ not json');
      expect(cache.read()).toBeNull();

      writeFileSync(path, JSON.stringify({ checkedAt: 5, latest: '<script>alert(1)</script>' }));
      expect(cache.read()).toEqual({ checkedAt: 5, latest: null });
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it('does not stop the program when it cannot write', () => {
    const cache = new FileUpdateCache(join(tmpdir(), 'greenlight-no-such-folder', '\0', 'x.json'));

    expect(() => cache.write({ checkedAt: 1, latest: null })).not.toThrow();
  });
});
