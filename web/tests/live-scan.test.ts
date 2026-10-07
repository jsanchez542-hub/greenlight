import { N8nApiError } from 'greenlight';
import { describe, expect, it } from 'vitest';
import { describeScanFailure, hostOf, isLiveScanConfigured, liveCache } from '@/lib/server/live-scan';

const env = {
  N8N_BASE_URL: 'https://reader:hunter2@n8n.internal.test',
  N8N_API_KEY: 'key-4f9c1e',
};

describe('isLiveScanConfigured', () => {
  it('needs both the address and the key', () => {
    expect(isLiveScanConfigured({ N8N_BASE_URL: 'https://n8n.test', N8N_API_KEY: 'k' })).toBe(true);
    expect(isLiveScanConfigured({ N8N_BASE_URL: 'https://n8n.test' })).toBe(false);
    expect(isLiveScanConfigured({ N8N_API_KEY: 'k' })).toBe(false);
  });

  it('treats blank values as missing', () => {
    expect(isLiveScanConfigured({ N8N_BASE_URL: '  ', N8N_API_KEY: 'k' })).toBe(false);
    expect(isLiveScanConfigured({})).toBe(false);
  });
});

describe('describeScanFailure', () => {
  it('keeps the backend message for an API error', () => {
    const error = new N8nApiError('n8n API returned 401 for /api/v1/workflows.', 401);
    expect(describeScanFailure(error, env)).toBe(
      'The scan could not finish: n8n API returned 401 for /api/v1/workflows.',
    );
  });

  it('removes the API key wherever it appears', () => {
    const error = new Error('request failed with key-4f9c1e in the header');
    expect(describeScanFailure(error, env)).not.toContain('key-4f9c1e');
  });

  it('removes credentials embedded in the instance address', () => {
    const cause = new Error('connect ECONNREFUSED https://reader:hunter2@n8n.internal.test');
    const text = describeScanFailure(new Error('fetch failed', { cause }), env);

    expect(text).toContain('fetch failed');
    expect(text).not.toContain('hunter2');
    expect(text).toContain('[redacted]');
  });

  it('names the error code when the underlying error has no message', () => {
    const cause = Object.assign(new AggregateError([]), { code: 'ECONNREFUSED' });
    const text = describeScanFailure(new TypeError('fetch failed', { cause }), env);

    expect(text).toBe('The scan could not finish: fetch failed (ECONNREFUSED)');
  });

  it('describes a thrown value that is not an error', () => {
    expect(describeScanFailure('boom', env)).toBe('The scan could not finish: unknown error');
  });
});

describe('liveCache', () => {
  const settings = { N8N_BASE_URL: 'https://cache.test', N8N_API_KEY: 'first-key' };

  it('keeps one cache while the settings stay the same', () => {
    expect(liveCache(settings)).toBe(liveCache({ ...settings }));
  });

  it('starts a new cache when the key or the address changes', () => {
    const before = liveCache(settings);
    expect(liveCache({ ...settings, N8N_API_KEY: 'second-key' })).not.toBe(before);
  });

  it('starts a new cache when the interval changes', () => {
    const before = liveCache(settings);
    expect(liveCache({ ...settings, GREENLIGHT_SCAN_INTERVAL_MINUTES: '9' })).not.toBe(before);
  });
});

describe('hostOf', () => {
  it('keeps only the host and port, never the path or credentials', () => {
    expect(hostOf({ N8N_BASE_URL: 'https://user:secret@n8n.example.com:5678/some/path?x=1' })).toBe(
      'n8n.example.com:5678',
    );
  });

  it('is null when there is no usable address', () => {
    expect(hostOf({})).toBeNull();
    expect(hostOf({ N8N_BASE_URL: 'not a url' })).toBeNull();
  });
});

describe('isLiveScanConfigured with unsafe addresses', () => {
  const key = 'a-key';

  it('refuses an address that would send the key somewhere it should not go', () => {
    for (const address of [
      'file:///etc/passwd',
      'javascript:alert(1)',
      'ftp://n8n.example.com',
      'https://user:pass@n8n.example.com',
      'not a url',
    ]) {
      expect(isLiveScanConfigured({ N8N_BASE_URL: address, N8N_API_KEY: key })).toBe(false);
    }
  });

  it('accepts a plain address', () => {
    expect(isLiveScanConfigured({ N8N_BASE_URL: 'https://n8n.example.com', N8N_API_KEY: key })).toBe(true);
  });

  it('refuses plain http to a public host unless the operator opted in', () => {
    const settings = { N8N_BASE_URL: 'http://n8n.example.com', N8N_API_KEY: key };
    expect(isLiveScanConfigured(settings)).toBe(false);
    expect(isLiveScanConfigured({ ...settings, GREENLIGHT_ALLOW_INSECURE_HTTP: '1' })).toBe(true);
  });
});
