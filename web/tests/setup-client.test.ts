import { describe, expect, it } from 'vitest';
import { fetchSetupStatus } from '@/lib/setup-client';
import { pageLabel } from '@/lib/navigation';
import { stepIconState, stepStatusLabel } from '@/lib/setup-status';

const status = {
  hasAddress: true,
  hasKey: true,
  diagnosis: {
    ok: true,
    host: 'n8n.test',
    workflowCount: 3,
    steps: [{ id: 'address', label: 'The address looks valid', status: 'ok', detail: 'The address is valid.' }],
  },
};

const signal = new AbortController().signal;

function respondWith(body: unknown, statusCode = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status: statusCode });
}

describe('fetchSetupStatus', () => {
  it('returns the parsed status', async () => {
    const result = await fetchSetupStatus(signal, respondWith(status));
    expect(result.diagnosis.workflowCount).toBe(3);
  });

  it('surfaces the message the server sent', async () => {
    const fetchImpl = respondWith({ error: 'This host is not allowed.' }, 403);
    await expect(fetchSetupStatus(signal, fetchImpl)).rejects.toThrow('This host is not allowed.');
  });

  it('explains a server that cannot be reached', async () => {
    const offline: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(fetchSetupStatus(signal, offline)).rejects.toThrow('did not answer');
  });

  it('rejects a body that does not follow the contract', async () => {
    await expect(fetchSetupStatus(signal, respondWith({ hasAddress: true }))).rejects.toThrow();
  });
});

describe('step presentation', () => {
  it('gives each step status its own icon state and a word, so colour is never alone', () => {
    expect(stepIconState('ok')).toBe('healthy');
    expect(stepIconState('failed')).toBe('critical');
    expect(stepIconState('skipped')).toBe('no-runs');
    expect(Object.values(stepStatusLabel)).toEqual(['Passed', 'Failed', 'Skipped']);
  });
});

describe('pageLabel', () => {
  it('names the setup page and the sections, and flags anything else', () => {
    expect(pageLabel('/setup')).toBe('setup');
    expect(pageLabel('/workflows/inventory')).toBe('workflows');
    expect(pageLabel('/')).toBe('overview');
    expect(pageLabel('/nowhere')).toBe('not found');
  });
});
