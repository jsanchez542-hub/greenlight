import { N8nApiError } from 'greenlight';
import { describe, expect, it } from 'vitest';
import { describeScanFailure, isLiveScanConfigured } from '@/lib/server/live-scan';

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

  it('describes a thrown value that is not an error', () => {
    expect(describeScanFailure('boom', env)).toBe('The scan could not finish: unknown error');
  });
});
