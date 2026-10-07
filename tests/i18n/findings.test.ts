import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Finding } from '../../src/analysis/types.js';
import { describeFinding, evidenceLabel, evidenceValue } from '../../src/i18n/index.js';

const base = { workflowId: 'wf', workflowName: 'Sync' } as const;

const silentError: Finding = {
  ...base,
  detector: 'silent-error',
  severity: 'critical',
  summary: 'english',
  evidence: { node: 'Send 1.5 receipt', executionsWithError: 3, executionsInspected: 5 },
};
const drift: Finding = {
  ...base,
  detector: 'duration-drift',
  severity: 'warning',
  summary: 'english',
  evidence: { baselineMedian: '1.2s', recentMedian: '10.5s', slowdown: '8.6x' },
};
const silence: Finding = {
  ...base,
  detector: 'silence',
  severity: 'critical',
  summary: 'english',
  evidence: { silentFor: '3.2 days', usualInterval: '45 min' },
};
const drop: Finding = {
  ...base,
  detector: 'frequency-drop',
  severity: 'warning',
  summary: 'english',
  evidence: { recentRuns: 1, expectedRuns: 24, windowHours: 24 },
};

describe('describeFinding', () => {
  it('returns the original sentence in English', () => {
    expect(describeFinding(silentError, 'en')).toBe('english');
  });

  it('tells each check in Spanish from the same numbers', () => {
    expect(describeFinding(silentError, 'es')).toContain(
      '“Send 1.5 receipt” devolvió un error en 3 de las últimas 5 ejecuciones correctas',
    );
    expect(describeFinding(drift, 'es')).toContain('de 1,2 s a 10,5 s, es decir, 8,6 veces más lento');
    expect(describeFinding(silence, 'es')).toContain('desde hace 3,2 días');
    expect(describeFinding(silence, 'es')).toContain('cada 45 min');
    expect(describeFinding(drop, 'es')).toContain('Se ejecutó 1 vez en las últimas 24 h, cuando se esperaban unas 24');
  });

  it('never invents a sentence when the evidence is missing: it keeps the original', () => {
    for (const finding of [silentError, drift, silence, drop]) {
      expect(describeFinding({ ...finding, evidence: {} }, 'es')).toBe('english');
    }
  });
});

describe('evidence', () => {
  it('turns numbers into Spanish only for durations, never for names', () => {
    expect(evidenceValue('silentFor', '9.0 h', 'es')).toBe('9,0 h');
    expect(evidenceValue('recentMedian', '10.5s', 'es')).toBe('10,5 s');
    expect(evidenceValue('silentFor', '2.1 days', 'es')).toBe('2,1 días');
    expect(evidenceValue('node', 'Step 1.2 of 3s', 'es')).toBe('Step 1.2 of 3s');
    expect(evidenceValue('lastRunAt', '2026-03-02T00:00:00.000Z', 'es')).toBe('2026-03-02T00:00:00.000Z');
    expect(evidenceValue('silentFor', '9.0 h', 'en')).toBe('9.0 h');
  });

  it('shows an unknown key as it is', () => {
    expect(evidenceLabel('somethingNew', 'es')).toBe('somethingNew');
    expect(evidenceLabel('node', 'es')).toBe('Nodo');
  });
});

describe('the synthetic instance', () => {
  it.skipIf(!existsSync('dist/index.js'))('is described in Spanish for every finding it produces', () => {
    const json = execFileSync(process.execPath, ['examples/synthetic-instance.mjs', '--json'], { encoding: 'utf8' });
    const findings = (JSON.parse(json) as { findings: Finding[] }).findings;

    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      const spanish = describeFinding(finding, 'es');
      expect(spanish, finding.detector).not.toBe(finding.summary);
      expect(spanish).not.toMatch(/undefined|NaN/);
    }
  });
});
