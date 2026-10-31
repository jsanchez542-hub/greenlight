import { ConfigError, MAX_CONCURRENCY, N8nApiError, loadConfig } from 'greenlight-n8n';
import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { failureText } from '@/lib/failure';
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

  describe('a setting that was refused', () => {
    const connection = { N8N_BASE_URL: 'https://n8n.example.com', N8N_API_KEY: 'key-4f9c1e' };
    const refused = (setting: string, value: string): unknown => {
      try {
        loadConfig({ ...connection, [setting]: value });
      } catch (error) {
        return error;
      }
      throw new Error('The setting was accepted.');
    };

    it.each([
      ['GREENLIGHT_EXECUTION_LIMIT', '0', 'scanBadExecutionLimit'],
      ['GREENLIGHT_DETAIL_SAMPLE', 'many', 'scanBadDetailSample'],
      ['GREENLIGHT_CONCURRENCY', '99', 'scanBadConcurrency'],
    ])('names %s, so the page can say which one to fix', (setting, value, code) => {
      expect(refused(setting, value)).toBeInstanceOf(ConfigError);
      expect(describeScanFailure(refused(setting, value))).toBe(code);
    });

    it('names a setting the dashboard does not know in general words', () => {
      expect(describeScanFailure(new ConfigError('GREENLIGHT_SOMETHING is wrong', ['GREENLIGHT_SOMETHING']))).toBe('scanBadSetting');
      expect(describeScanFailure(new ConfigError('no names', []))).toBe('scanBadSetting');
    });

    it.each([
      ['scanBadExecutionLimit', 'GREENLIGHT_EXECUTION_LIMIT'],
      ['scanBadDetailSample', 'GREENLIGHT_DETAIL_SAMPLE'],
      ['scanBadConcurrency', 'GREENLIGHT_CONCURRENCY'],
    ] as const)('says %s in both languages, with the variable and without its value', (code, variable) => {
      for (const t of [en, es]) {
        const text = failureText(code, t);

        expect(text).toContain(variable);
        expect(text).not.toContain('99');
      }
    });

    it('writes the largest concurrency the program accepts', () => {
      expect(failureText('scanBadConcurrency', en)).toContain(`1 to ${MAX_CONCURRENCY}`);
      expect(failureText('scanBadConcurrency', es)).toContain(`1 a ${MAX_CONCURRENCY}`);
    });

    it('carries no text of the refusal, whatever the value was', () => {
      const secret = 'value-that-must-not-travel';
      const code = describeScanFailure(new ConfigError(`GREENLIGHT_CONCURRENCY must be a number, received "${secret}"`, ['GREENLIGHT_CONCURRENCY']));

      expect(code).toBe('scanBadConcurrency');
      expect(code).not.toContain(secret);
    });
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

  it('starts a new cache when the number of workflows read at once changes', () => {
    const before = liveCache(settings);
    expect(liveCache({ ...settings, GREENLIGHT_CONCURRENCY: '8' })).not.toBe(before);
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
