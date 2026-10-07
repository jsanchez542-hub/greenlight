import type { Diagnosis } from 'greenlight';
import { describe, expect, it } from 'vitest';
import { parseSetupStatus, pollDelayMs, setupPhase, type SetupStatus } from '@/lib/setup-status';
import { createSetupChecker } from '@/lib/server/setup-check';

function diagnosis(overrides: Partial<Diagnosis> = {}): Diagnosis {
  return {
    ok: false,
    host: null,
    workflowCount: null,
    steps: [
      { id: 'address', label: 'The address looks valid', status: 'failed', detail: 'No address was given.', hint: 'Use the address you open n8n with.' },
      { id: 'reach', label: 'The instance answers', status: 'skipped', detail: 'Skipped because an earlier step failed.' },
    ],
    ...overrides,
  };
}

function status(overrides: Partial<SetupStatus> = {}): SetupStatus {
  return { hasAddress: false, hasKey: false, diagnosis: diagnosis(), ...overrides };
}

describe('setupPhase', () => {
  it('waits while nothing has been saved', () => {
    expect(setupPhase(status())).toBe('waiting');
  });

  it('is failing once either value exists but the check does not pass', () => {
    expect(setupPhase(status({ hasAddress: true }))).toBe('failing');
    expect(setupPhase(status({ hasKey: true }))).toBe('failing');
  });

  it('is connected only when the diagnosis passes', () => {
    expect(setupPhase(status({ hasAddress: true, hasKey: true, diagnosis: diagnosis({ ok: true }) }))).toBe(
      'connected',
    );
  });
});

describe('pollDelayMs', () => {
  it('polls faster while waiting than while failing, and stops when connected', () => {
    expect(pollDelayMs('waiting')).toBeLessThan(pollDelayMs('failing') ?? 0);
    expect(pollDelayMs('connected')).toBeNull();
  });
});

describe('parseSetupStatus', () => {
  it('accepts what the server sends, with and without hints', () => {
    const parsed = parseSetupStatus(status({ hasAddress: true }));
    expect(parsed.diagnosis.steps[0]?.hint).toBe('Use the address you open n8n with.');
    expect(parsed.diagnosis.steps[1]).not.toHaveProperty('hint');
  });

  it('rejects a step status it does not know', () => {
    const broken = status();
    (broken.diagnosis.steps[0] as { status: string }).status = 'maybe';
    expect(() => parseSetupStatus(broken)).toThrow('steps[0].status');
  });

  it('rejects input that is not an object', () => {
    expect(() => parseSetupStatus(null)).toThrow();
  });
});

describe('createSetupChecker', () => {
  function checker() {
    const clock = { now: 0 };
    const calls: Array<{ baseUrl: string | undefined; apiKey: string | undefined; lang: string | undefined }> = [];
    const check = createSetupChecker({
      diagnose: async (input) => {
        calls.push({ baseUrl: input.baseUrl, apiKey: input.apiKey, lang: input.lang });
        return diagnosis({ ok: true, host: 'n8n.test', workflowCount: 3 });
      },
      now: () => clock.now,
    });
    return { check, clock, calls };
  }

  it('reports which values are present without exposing them', async () => {
    const { check } = checker();
    const result = await check('en', { N8N_BASE_URL: 'https://n8n.test', N8N_API_KEY: 'secret' });

    expect(result).toMatchObject({ hasAddress: true, hasKey: true });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('passes trimmed values to the diagnosis', async () => {
    const { check, calls } = checker();
    await check('en', { N8N_BASE_URL: ' https://n8n.test ', N8N_API_KEY: ' k ' });

    expect(calls).toEqual([{ baseUrl: 'https://n8n.test', apiKey: 'k', lang: 'en' }]);
  });

  it('reuses a fresh answer for the same settings', async () => {
    const { check, clock, calls } = checker();
    const env = { N8N_BASE_URL: 'https://n8n.test', N8N_API_KEY: 'k' };
    await check('en', env);
    clock.now += 1_000;
    await check('en', env);

    expect(calls).toHaveLength(1);
  });

  it('checks again after the answer has aged', async () => {
    const { check, clock, calls } = checker();
    const env = { N8N_BASE_URL: 'https://n8n.test', N8N_API_KEY: 'k' };
    await check('en', env);
    clock.now += 2_500;
    await check('en', env);

    expect(calls).toHaveLength(2);
  });

  it('checks again at once when the settings change', async () => {
    const { check, calls } = checker();
    await check('en', { N8N_BASE_URL: 'https://n8n.test', N8N_API_KEY: 'k' });
    await check('en', { N8N_BASE_URL: 'https://n8n.test', N8N_API_KEY: 'other' });

    expect(calls).toHaveLength(2);
  });
});
