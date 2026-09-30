import { describe, expect, it } from 'vitest';
import {
  WebhookError,
  buildFailureAlert,
  buildFindingsAlert,
  deliverAlert,
  type AlertPayload,
} from '../../src/watch/notify.js';
import type { TrackedFinding } from '../../src/watch/findings.js';

function tracked(overrides: Partial<TrackedFinding> = {}): TrackedFinding {
  return {
    key: 'wf-1:silent-error:Send receipt',
    workflowId: 'wf-1',
    workflowName: 'Order confirmations',
    detector: 'silent-error',
    severity: 'critical',
    summary: '"Send receipt" emitted an error in 5 of the last 5 successful executions.',
    missedScans: 0,
    ...overrides,
  };
}

const payload: AlertPayload = buildFailureAlert('n8n.example.com', '2026-01-10T12:00:00.000Z', 3);

describe('buildFindingsAlert', () => {
  it('writes a subject that says how bad it is', () => {
    const alert = buildFindingsAlert({
      instance: 'n8n.example.com',
      scannedAt: '2026-01-10T12:00:00.000Z',
      added: [tracked()],
      resolved: [],
    });

    expect(alert.subject).toBe('GreenLight: 1 new critical finding on n8n.example.com');
    expect(alert.text).toContain('CRITICAL Order confirmations (silent-error)');
    expect(alert.newFindings[0]?.workflowId).toBe('wf-1');
  });

  it('does not call a mix critical', () => {
    const alert = buildFindingsAlert({
      instance: 'n8n.example.com',
      scannedAt: '2026-01-10T12:00:00.000Z',
      added: [tracked(), tracked({ severity: 'warning', detector: 'duration-drift' })],
      resolved: [],
    });

    expect(alert.subject).toBe('GreenLight: 2 new findings on n8n.example.com');
  });

  it('announces a workflow that recovered', () => {
    const alert = buildFindingsAlert({
      instance: 'n8n.example.com',
      scannedAt: '2026-01-10T12:00:00.000Z',
      added: [],
      resolved: [tracked()],
    });

    expect(alert.subject).toBe('GreenLight: 1 finding resolved on n8n.example.com');
    expect(alert.text).toContain('Resolved:');
    expect(alert.resolvedFindings).toHaveLength(1);
  });
});

describe('deliverAlert', () => {
  function recordingFetch(status: number, calls: { url: string; init: RequestInit }[]) {
    return (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response('', { status });
    }) as typeof globalThis.fetch;
  }

  it('posts the alert as JSON with the bearer token', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    await deliverAlert(payload, {
      url: 'https://hooks.example.com/abc',
      token: 'secret',
      fetch: recordingFetch(200, calls),
    });

    expect(calls[0]?.init.method).toBe('POST');
    expect((calls[0]?.init.headers as Record<string, string>)['authorization']).toBe('Bearer secret');
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({ source: 'greenlight', type: 'scan-failing' });
  });

  it('sends no authorization header when there is no token', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    await deliverAlert(payload, {
      url: 'https://hooks.example.com/abc',
      token: null,
      fetch: recordingFetch(200, calls),
    });

    expect((calls[0]?.init.headers as Record<string, string>)['authorization']).toBeUndefined();
  });

  it('fails on an error status without revealing the URL', async () => {
    const attempt = deliverAlert(payload, {
      url: 'https://hooks.example.com/secret-path',
      token: null,
      fetch: recordingFetch(500, []),
    });

    await expect(attempt).rejects.toBeInstanceOf(WebhookError);
    await expect(attempt).rejects.toThrow('HTTP 500');
    await expect(attempt).rejects.not.toThrow(/secret-path/);
  });

  it('turns a network failure into a readable error', async () => {
    const failing = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof globalThis.fetch;

    await expect(
      deliverAlert(payload, { url: 'https://hooks.example.com/x', token: null, fetch: failing }),
    ).rejects.toThrow('Could not reach the webhook: fetch failed');
  });
});
