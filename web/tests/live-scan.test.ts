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
  it('names the kind of failure an API status stands for', () => {
    const cases: Array<[number, string]> = [
      [401, 'scanRejectedKey'],
      [403, 'scanForbidden'],
      [404, 'scanNotFound'],
      [500, 'scanServerError'],
      [503, 'scanServerError'],
      [418, 'scanFailed'],
    ];
    for (const [status, code] of cases) {
      expect(describeScanFailure(new N8nApiError('n8n API returned a status.', status))).toBe(code);
    }
  });

  it('names the network failures that have a cause the person can act on', () => {
    const cause = (code: string) => Object.assign(new Error('low level'), { code });
    const failure = (code: string) => new TypeError('fetch failed', { cause: cause(code) });

    expect(describeScanFailure(failure('ENOTFOUND'))).toBe('scanUnresolved');
    expect(describeScanFailure(failure('EAI_AGAIN'))).toBe('scanUnresolved');
    expect(describeScanFailure(failure('ECONNREFUSED'))).toBe('scanRefused');
    expect(describeScanFailure(failure('ETIMEDOUT'))).toBe('scanTimeout');
    expect(describeScanFailure(failure('SELF_SIGNED_CERT_IN_CHAIN'))).toBe('scanCertificate');
    expect(describeScanFailure(failure('UNABLE_TO_VERIFY_LEAF_SIGNATURE'))).toBe('scanCertificate');
    expect(describeScanFailure(failure('SOMETHING_ELSE'))).toBe('scanFailed');
  });

  it('names a timeout by the name of the error', () => {
    expect(describeScanFailure(Object.assign(new Error('late'), { name: 'TimeoutError' }))).toBe('scanTimeout');
  });

  it('carries no text of the error at all, so no secret can travel with it', () => {
    const secretError = new Error(`request failed with ${env.N8N_API_KEY} for https://reader:hunter2@n8n.internal.test`, {
      cause: new Error('connect ECONNREFUSED https://reader:hunter2@n8n.internal.test'),
    });
    const code = describeScanFailure(secretError);

    expect(code).toBe('scanFailed');
    expect(code).not.toContain('hunter2');
    expect(code).not.toContain(env.N8N_API_KEY);
  });

  it('describes a thrown value that is not an error', () => {
    expect(describeScanFailure('boom')).toBe('scanFailed');
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
