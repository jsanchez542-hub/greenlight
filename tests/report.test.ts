import { describe, expect, it } from 'vitest';
import { DEFAULT_CONCURRENCY, MAX_CONCURRENCY } from '../src/concurrency.js';
import { ConfigError, loadConfig, loadWatchConfig } from '../src/config.js';
import { messagesFor } from '../src/i18n/index.js';
import { renderReport } from '../src/report.js';
import type { ScanResult } from '../src/scan.js';

const clean: ScanResult = {
  version: 1,
  scannedAt: '2026-01-10T12:00:00.000Z',
  workflowsScanned: 23,
  workflows: [],
  findings: [],
};

const withFinding: ScanResult = {
  ...clean,
  findings: [
    {
      workflowId: 'wf-1',
      workflowName: 'Daily digest',
      detector: 'silent-error',
      severity: 'critical',
      summary: 'A step failed while the run reported success.',
      evidence: { node: 'Send Email', executionsWithError: 5 },
    },
  ],
};

describe('renderReport', () => {
  it('says so plainly when there is nothing wrong', () => {
    expect(renderReport(clean, false)).toContain('nothing to report');
  });

  it('names the workflow, the severity and the evidence', () => {
    const output = renderReport(withFinding, false);

    expect(output).toContain('CRITICAL');
    expect(output).toContain('Daily digest');
    expect(output).toContain('Send Email');
    expect(output).toContain('1 finding, 1 critical');
  });

  it('leaves escape codes out when the output is not a terminal', () => {
    expect(renderReport(withFinding, false)).not.toContain('\u001B[');
  });
});

describe('loadConfig', () => {
  it('explains what to set instead of failing obscurely', () => {
    expect(() => loadConfig({})).toThrow(/N8N_BASE_URL and N8N_API_KEY/);
  });

  it('applies defaults when the optional tuning knobs are absent', () => {
    const config = loadConfig({ N8N_BASE_URL: 'https://n8n.example.com', N8N_API_KEY: 'k' });

    expect(config.executionLimit).toBe(200);
    expect(config.detailSampleSize).toBe(5);
    expect(config.concurrency).toBe(4);
  });

  it('reads how many workflows to scan at once, from 1 to the maximum', () => {
    const connection = { N8N_BASE_URL: 'https://n8n.example.com', N8N_API_KEY: 'k' };

    expect(loadConfig({ ...connection, GREENLIGHT_CONCURRENCY: '1' }).concurrency).toBe(1);
    expect(loadConfig({ ...connection, GREENLIGHT_CONCURRENCY: ' 8 ' }).concurrency).toBe(8);
    expect(loadConfig({ ...connection, GREENLIGHT_CONCURRENCY: String(MAX_CONCURRENCY) }).concurrency).toBe(
      MAX_CONCURRENCY,
    );
    expect(loadConfig({ ...connection, GREENLIGHT_CONCURRENCY: '' }).concurrency).toBe(DEFAULT_CONCURRENCY);
  });

  it('rejects a concurrency that is zero, fractional, not a number or above the maximum', () => {
    const connection = { N8N_BASE_URL: 'https://n8n.example.com', N8N_API_KEY: 'k' };

    for (const raw of ['0', '-3', '2.5', 'many']) {
      expect(() => loadConfig({ ...connection, GREENLIGHT_CONCURRENCY: raw })).toThrow(/positive whole number/);
    }
    expect(() => loadConfig({ ...connection, GREENLIGHT_CONCURRENCY: String(MAX_CONCURRENCY + 1) })).toThrow(
      /from 1 to 16/,
    );
  });

  it('refuses a setting with an error that names it, so the value never has to be repeated', () => {
    const connection = { N8N_BASE_URL: 'https://n8n.example.com', N8N_API_KEY: 'k' };
    const refusal = (action: () => unknown): ConfigError => {
      try {
        action();
      } catch (error) {
        return error as ConfigError;
      }
      throw new Error('The setting was accepted.');
    };

    const cases: Array<[() => unknown, string[]]> = [
      [() => loadConfig({}), ['N8N_BASE_URL', 'N8N_API_KEY']],
      [() => loadConfig({ ...connection, GREENLIGHT_EXECUTION_LIMIT: '0' }), ['GREENLIGHT_EXECUTION_LIMIT']],
      [() => loadConfig({ ...connection, GREENLIGHT_DETAIL_SAMPLE: 'x' }), ['GREENLIGHT_DETAIL_SAMPLE']],
      [() => loadConfig({ ...connection, GREENLIGHT_CONCURRENCY: '99' }), ['GREENLIGHT_CONCURRENCY']],
      [() => loadWatchConfig({ GREENLIGHT_NOTIFY_MIN: 'loud' }), ['GREENLIGHT_NOTIFY_MIN']],
      [() => loadWatchConfig({ GREENLIGHT_WEBHOOK_URL: 'nope' }), ['GREENLIGHT_WEBHOOK_URL']],
      [() => loadWatchConfig({ GREENLIGHT_INTERVAL_MINUTES: '-5' }), ['GREENLIGHT_INTERVAL_MINUTES']],
    ];
    for (const [action, settings] of cases) {
      const error = refusal(action);

      expect(error).toBeInstanceOf(ConfigError);
      expect(error.settings).toEqual(settings);
    }
  });

  it('documents the setting in the help of both languages with the real limits', () => {
    for (const lang of ['en', 'es'] as const) {
      const line = messagesFor(lang)
        .cli.usage('greenlight')
        .split('\n')
        .find((text) => text.includes('GREENLIGHT_CONCURRENCY'));

      expect(line).toContain(String(MAX_CONCURRENCY));
      expect(line).toContain(String(DEFAULT_CONCURRENCY));
    }
  });

  it('rejects a limit that is not a positive whole number', () => {
    expect(() =>
      loadConfig({
        N8N_BASE_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'k',
        GREENLIGHT_EXECUTION_LIMIT: '0',
      }),
    ).toThrow(/positive whole number/);
  });
});
