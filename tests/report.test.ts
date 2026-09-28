import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { renderReport } from '../src/report.js';
import type { ScanResult } from '../src/scan.js';

const clean: ScanResult = {
  scannedAt: '2026-01-10T12:00:00.000Z',
  workflowsScanned: 23,
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
