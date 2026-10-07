import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { describe, expect, it } from 'vitest';
import { fetchSetupStatus } from '@/lib/setup-client';
import { pageLabel } from '@/lib/navigation';
import { stepIconState } from '@/lib/setup-status';

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

  it('surfaces the kind of failure the server named, and never its own words', async () => {
    await expect(fetchSetupStatus(signal, respondWith({ error: 'hostNotAllowed' }, 403))).rejects.toMatchObject({
      code: 'hostNotAllowed',
    });
    await expect(fetchSetupStatus(signal, respondWith({ error: 'This host is not allowed.' }, 403))).rejects.toMatchObject({
      code: 'serverStatus',
    });
  });

  it('explains a server that cannot be reached', async () => {
    const offline: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(fetchSetupStatus(signal, offline)).rejects.toMatchObject({ code: 'serverSilent' });
  });

  it('rejects a body that does not follow the contract', async () => {
    await expect(fetchSetupStatus(signal, respondWith({ hasAddress: true }))).rejects.toMatchObject({ code: 'invalidAnswer' });
  });
});

describe('step presentation', () => {
  it('gives each step status its own icon state and a word, so colour is never alone', () => {
    expect(stepIconState('ok')).toBe('healthy');
    expect(stepIconState('failed')).toBe('critical');
    expect(stepIconState('skipped')).toBe('no-runs');
    expect(Object.values(en.setup.steps)).toEqual(['Passed', 'Failed', 'Skipped']);
    expect(Object.values(es.setup.steps)).toEqual(['Correcto', 'Fallido', 'Omitido']);
  });
});

describe('pageLabel', () => {
  it('names the setup page and the sections, and flags anything else', () => {
    expect(pageLabel('/setup', en)).toBe('setup');
    expect(pageLabel('/setup', es)).toBe('conexión');
    expect(pageLabel('/workflows/inventory', en)).toBe('workflows');
    expect(pageLabel('/', en)).toBe('overview');
    expect(pageLabel('/', es)).toBe('resumen');
    expect(pageLabel('/nowhere', en)).toBe('not found');
  });
});
