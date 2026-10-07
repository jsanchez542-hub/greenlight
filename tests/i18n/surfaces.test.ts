import { describe, expect, it } from 'vitest';
import { loadConfig, loadWatchConfig } from '../../src/config.js';
import { N8nApiError, N8nClient } from '../../src/n8n/client.js';
import { renderReport } from '../../src/report.js';
import { nodeVersionProblem } from '../../src/runtime.js';
import type { ScanResult } from '../../src/scan.js';
import { diagnose } from '../../src/setup/diagnose.js';
import { renderDiagnosis } from '../../src/setup/init.js';
import { buildFailureAlert, buildFindingsAlert, buildRecoveryAlert } from '../../src/watch/notify.js';
import { runCycle } from '../../src/watch/watch.js';
import { emptyState } from '../../src/watch/state.js';

const finding = {
  workflowId: 'wf-1',
  workflowName: 'Daily digest',
  detector: 'silent-error',
  severity: 'critical',
  summary: 'English sentence.',
  evidence: { node: 'Send Email', executionsWithError: 5, executionsInspected: 5 },
} as const;

const result: ScanResult = {
  version: 1,
  scannedAt: '2026-01-10T12:00:00.000Z',
  workflowsScanned: 1,
  workflows: [],
  findings: [finding],
};

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });

describe('the report', () => {
  it('is in Spanish on request and keeps English by default', () => {
    const spanish = renderReport(result, false, 'es');

    expect(spanish).toContain('1 workflow analizado');
    expect(spanish).toContain('1 hallazgo, 1 crítico');
    expect(spanish).toContain('CRÍTICO');
    expect(spanish).toContain('devolvió un error en 5 de las últimas 5');
    expect(spanish).toContain('Ejecuciones con error');
    expect(renderReport(result, false)).toContain('1 workflow');
    expect(renderReport(result, false)).toContain('CRITICAL');
  });

  it('says plainly in Spanish when there is nothing wrong', () => {
    expect(renderReport({ ...result, findings: [] }, false, 'es')).toContain('sin hallazgos');
  });

  it('keeps every line of a finding aligned under its heading, in both languages', () => {
    for (const lang of ['en', 'es'] as const) {
      const lines = renderReport({ ...result, findings: [{ ...finding, severity: 'warning' }] }, false, lang).split('\n');
      const body = lines.slice(3).filter((line) => line.trim() !== '');
      const indents = new Set(body.slice(0, 1).map((line) => line.length - line.trimStart().length));
      expect(indents.size).toBe(1);
    }
  });
});

describe('the connection check', () => {
  it('explains a rejected key in Spanish, without ever showing the key', async () => {
    const key = 'super-secret-key-value';
    const fetch = (async () => json({}, 401)) as unknown as typeof globalThis.fetch;

    const diagnosis = await diagnose({ baseUrl: 'https://n8n.example.com', apiKey: key, fetch, lang: 'es' });
    const text = renderDiagnosis(diagnosis, 'es').join('\n');

    expect(diagnosis.ok).toBe(false);
    expect(text).toContain('La instancia rechazó la clave de API.');
    expect(text).toContain('[fallo]');
    expect(text).not.toContain(key);
  });

  it('asks for the address in Spanish when there is none', async () => {
    const diagnosis = await diagnose({ baseUrl: '', apiKey: 'k', lang: 'es' });

    expect(diagnosis.steps[0]?.detail).toBe('No se indicó ninguna dirección.');
  });

  it('writes the error of the client itself in Spanish', async () => {
    const client = new N8nClient({
      baseUrl: 'https://n8n.example.com',
      apiKey: 'k',
      fetch: (async () => json({}, 500)) as unknown as typeof globalThis.fetch,
      lang: 'es',
    });

    await expect(client.listWorkflows()).rejects.toThrow(/La API de n8n respondió 500/);
    await expect(client.listWorkflows()).rejects.toBeInstanceOf(N8nApiError);
    expect(() => new N8nClient({ baseUrl: 'http://n8n.example.com', apiKey: 'k', lang: 'es' })).toThrow(
      /sin cifrar/,
    );
  });
});

describe('settings errors', () => {
  it('are written in the chosen language', () => {
    expect(() => loadConfig({}, 'es')).toThrow(/Faltan N8N_BASE_URL y N8N_API_KEY/);
    expect(() => loadWatchConfig({ GREENLIGHT_NOTIFY_MIN: 'loud' }, 'es')).toThrow(/debe ser "warning" o "critical"/);
    expect(() => loadWatchConfig({ GREENLIGHT_WEBHOOK_URL: 'nope' }, 'es')).toThrow(/dirección http o https válida/);
    expect(nodeVersionProblem('18.0.0', 'es')).toContain('necesita Node.js 22.12');
    expect(nodeVersionProblem('18.0.0')).toContain('needs Node.js 22.12');
  });
});

describe('alerts', () => {
  const tracked = { ...finding, key: 'wf-1:silent-error:Send Email', missedScans: 0 };

  it('are written in the language they are asked for and say which one', () => {
    const spanish = buildFindingsAlert({
      instance: 'n8n.example.com',
      scannedAt: result.scannedAt,
      added: [tracked],
      resolved: [],
      lang: 'es',
    });

    expect(spanish.lang).toBe('es');
    expect(spanish.subject).toBe('GreenLight: 1 hallazgo crítico nuevo en n8n.example.com');
    expect(spanish.text).toContain('CRÍTICO Daily digest (silent-error)');
    expect(spanish.text).toContain('devolvió un error en 5 de las últimas 5 ejecuciones correctas');
    expect(spanish.newFindings[0]?.summary).toBe(
      '“Send Email” devolvió un error en 5 de las últimas 5 ejecuciones correctas. El workflow indica que todo fue bien mientras este paso falla.',
    );

    const english = buildFindingsAlert({ instance: 'n8n.example.com', scannedAt: result.scannedAt, added: [tracked], resolved: [] });
    expect(english.lang).toBe('en');
    expect(english.subject).toBe('GreenLight: 1 new critical finding on n8n.example.com');
    expect(english.newFindings[0]?.summary).toBe('English sentence.');
  });

  it('fall back to the original sentence when an older state file had no evidence', () => {
    const { evidence: _evidence, ...old } = tracked;
    const alert = buildFindingsAlert({ instance: 'n8n', scannedAt: 'x', added: [old], resolved: [], lang: 'es' });

    expect(alert.newFindings[0]?.summary).toBe('English sentence.');
  });

  it('cover the failure and the recovery in Spanish', () => {
    expect(buildFailureAlert('n8n', 'x', 3, 'es').text).toContain('Los últimos 3 análisis fallaron');
    expect(buildFailureAlert('n8n', 'x', 1, 'es').text).toContain('El último análisis falló');
    expect(buildRecoveryAlert('n8n', 'x', 'es').subject).toBe('GreenLight vuelve a analizar n8n');
  });
});

describe('the watch log', () => {
  it('is written in Spanish when asked', async () => {
    const lines: string[] = [];
    const outcome = await runCycle({
      scan: async () => result,
      store: { load: () => emptyState(), save: () => undefined },
      deliver: null,
      instance: 'n8n.example.com',
      options: { notifyMinimum: 'warning', clearAfterScans: 2, failureThreshold: 3 },
      log: (line) => void lines.push(line),
      warn: (line) => void lines.push(line),
      lang: 'es',
    });

    expect(outcome.added).toBe(1);
    expect(lines[0]).toBe('NUEVO CRÍTICO Daily digest (silent-error)');
    expect(lines[1]).toBe('1 workflow analizado: 1 abierto, 1 nuevo, 0 resueltos.');
  });
});
