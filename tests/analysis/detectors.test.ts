import { describe, expect, it } from 'vitest';
import { analyseWorkflow } from '../../src/analysis/analyse.js';
import { detectDurationDrift } from '../../src/analysis/detectors/duration-drift.js';
import { detectFrequencyDrop } from '../../src/analysis/detectors/frequency-drop.js';
import { detectSilence } from '../../src/analysis/detectors/silence.js';
import { detectSilentErrors } from '../../src/analysis/detectors/silent-error.js';
import { defaultAnalysisOptions, type DetectorInput } from '../../src/analysis/types.js';
import type { Execution, ExecutionDetail, Workflow } from '../../src/n8n/types.js';

const NOW = new Date('2026-01-10T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

const workflow: Workflow = { id: 'wf-1', name: 'Daily digest', active: true };

function series(options: {
  count: number;
  everyMs: number;
  durationMs: number;
  endingAt: Date;
}): Execution[] {
  return Array.from({ length: options.count }, (_, index) => {
    const startedAt = new Date(options.endingAt.getTime() - index * options.everyMs);
    return {
      id: `e-${startedAt.getTime()}`,
      workflowId: workflow.id,
      status: 'success' as const,
      startedAt: startedAt.toISOString(),
      stoppedAt: new Date(startedAt.getTime() + options.durationMs).toISOString(),
    };
  });
}

function input(overrides: Partial<DetectorInput> = {}): DetectorInput {
  return {
    workflow,
    runsOnAClock: true,
    executions: [],
    executionDetails: [],
    now: NOW,
    options: defaultAnalysisOptions,
    ...overrides,
  };
}

function detailWithNodeError(nodeName: string, message: string): ExecutionDetail {
  return {
    id: 'detail-1',
    workflowId: workflow.id,
    status: 'success',
    startedAt: NOW.toISOString(),
    stoppedAt: NOW.toISOString(),
    data: {
      resultData: {
        runData: {
          [nodeName]: [{ data: { main: [[{ json: { error: message } }]] } }],
          Trigger: [{ data: { main: [[{ json: { timestamp: NOW.toISOString() } }]] } }],
        },
      },
    },
  };
}

describe('detectSilentErrors', () => {
  it('flags a node that fails while the execution reports success', () => {
    const findings = detectSilentErrors(
      input({ executionDetails: [detailWithNodeError('Get Unread Replies', 'Account Restricted')] }),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('critical');
    expect(findings[0]?.evidence['node']).toBe('Get Unread Replies');
  });

  it('ignores executions n8n already reported as failed', () => {
    const failed = { ...detailWithNodeError('Send Email', 'boom'), status: 'error' as const };

    expect(detectSilentErrors(input({ executionDetails: [failed] }))).toEqual([]);
  });

  it('leaves a workflow alone once it has been switched off on purpose', () => {
    const findings = detectSilentErrors(
      input({
        workflow: { ...workflow, active: false },
        executionDetails: [detailWithNodeError('Get Unread Replies', 'Account Restricted')],
      }),
    );

    expect(findings).toEqual([]);
  });

  it('stays quiet when every node returns clean output', () => {
    const clean: ExecutionDetail = {
      id: 'ok',
      workflowId: workflow.id,
      status: 'success',
      startedAt: NOW.toISOString(),
      stoppedAt: NOW.toISOString(),
      data: { resultData: { runData: { Send: [{ data: { main: [[{ json: { id: 'abc' } }]] } }] } } },
    };

    expect(detectSilentErrors(input({ executionDetails: [clean] }))).toEqual([]);
  });
});

describe('detectDurationDrift', () => {
  it('catches a workflow that quietly became nine times slower', () => {
    const executions = [
      ...series({ count: 30, everyMs: HOUR, durationMs: 1200, endingAt: new Date(NOW.getTime() - 25 * HOUR) }),
      ...series({ count: 10, everyMs: HOUR, durationMs: 10500, endingAt: NOW }),
    ];

    const findings = detectDurationDrift(input({ executions }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.detector).toBe('duration-drift');
    expect(findings[0]?.evidence['recentMedian']).toBe('10.5s');
  });

  it('tolerates ordinary variation', () => {
    const executions = [
      ...series({ count: 30, everyMs: HOUR, durationMs: 1200, endingAt: new Date(NOW.getTime() - 25 * HOUR) }),
      ...series({ count: 10, everyMs: HOUR, durationMs: 1400, endingAt: NOW }),
    ];

    expect(detectDurationDrift(input({ executions }))).toEqual([]);
  });

  it('refuses to judge without enough history', () => {
    const executions = [
      ...series({ count: 4, everyMs: HOUR, durationMs: 1200, endingAt: new Date(NOW.getTime() - 25 * HOUR) }),
      ...series({ count: 4, everyMs: HOUR, durationMs: 10500, endingAt: NOW }),
    ];

    expect(detectDurationDrift(input({ executions }))).toEqual([]);
  });
});

describe('detectSilence', () => {
  it('reports a scheduled workflow whose trigger stopped firing', () => {
    const executions = series({
      count: 20,
      everyMs: 5 * 60 * 1000,
      durationMs: 800,
      endingAt: new Date(NOW.getTime() - 6 * HOUR),
    });

    const findings = detectSilence(input({ executions }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('critical');
  });

  it('leaves webhook workflows alone, since idle time is normal for them', () => {
    const executions = series({
      count: 20,
      everyMs: 5 * 60 * 1000,
      durationMs: 800,
      endingAt: new Date(NOW.getTime() - 6 * HOUR),
    });

    expect(detectSilence(input({ runsOnAClock: false, executions }))).toEqual([]);
  });

  it('says nothing about a workflow that is switched off on purpose', () => {
    const executions = series({
      count: 20,
      everyMs: 5 * 60 * 1000,
      durationMs: 800,
      endingAt: new Date(NOW.getTime() - 6 * HOUR),
    });

    expect(
      detectSilence(input({ workflow: { ...workflow, active: false }, executions })),
    ).toEqual([]);
  });
});

describe('detectFrequencyDrop', () => {
  it('notices a schedule that was widened', () => {
    const executions = [
      ...series({ count: 48, everyMs: HOUR, durationMs: 800, endingAt: new Date(NOW.getTime() - 25 * HOUR) }),
      ...series({ count: 2, everyMs: 12 * HOUR, durationMs: 800, endingAt: NOW }),
    ];

    const findings = detectFrequencyDrop(input({ executions }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence['recentRuns']).toBe(2);
  });

  it('stays quiet while the cadence holds', () => {
    const executions = series({ count: 72, everyMs: HOUR, durationMs: 800, endingAt: NOW });

    expect(detectFrequencyDrop(input({ executions }))).toEqual([]);
  });
});

describe('analyseWorkflow', () => {
  it('does not report a frequency drop for something that stopped entirely', () => {
    const executions = series({
      count: 40,
      everyMs: 30 * 60 * 1000,
      durationMs: 800,
      endingAt: new Date(NOW.getTime() - 20 * HOUR),
    });

    const detectors = analyseWorkflow(input({ executions })).map((finding) => finding.detector);

    expect(detectors).toContain('silence');
    expect(detectors).not.toContain('frequency-drop');
  });

  it('puts critical findings first', () => {
    const executions = [
      ...series({ count: 30, everyMs: HOUR, durationMs: 1200, endingAt: new Date(NOW.getTime() - 25 * HOUR) }),
      ...series({ count: 10, everyMs: HOUR, durationMs: 10500, endingAt: NOW }),
    ];

    const findings = analyseWorkflow(
      input({ executions, executionDetails: [detailWithNodeError('Send Email', 'Account Restricted')] }),
    );

    expect(findings[0]?.severity).toBe('critical');
    expect(findings.at(-1)?.severity).toBe('warning');
  });
});
