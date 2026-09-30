import { describe, expect, it } from 'vitest';
import type { Finding } from '../../src/analysis/types.js';
import { atLeast, findingKey, trackFindings } from '../../src/watch/findings.js';

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    workflowId: 'wf-1',
    workflowName: 'Order confirmations',
    detector: 'duration-drift',
    severity: 'warning',
    summary: 'Typical run time rose from 1.2s to 10.5s.',
    evidence: { recentMedian: '10.5s' },
    ...overrides,
  };
}

describe('findingKey', () => {
  it('ignores the summary, which carries counts that change every scan', () => {
    const first = findingKey(finding({ summary: '5 of 5' }));
    const second = findingKey(finding({ summary: '4 of 5' }));

    expect(first).toBe(second);
  });

  it('tells two failing nodes of the same workflow apart', () => {
    const send = findingKey(finding({ detector: 'silent-error', evidence: { node: 'Send' } }));
    const save = findingKey(finding({ detector: 'silent-error', evidence: { node: 'Save' } }));

    expect(send).not.toBe(save);
  });
});

describe('trackFindings', () => {
  it('reports a finding the first time it appears', () => {
    const { added, resolved } = trackFindings({}, [finding()], 2);

    expect(added).toHaveLength(1);
    expect(resolved).toEqual([]);
  });

  it('stays quiet about a finding that was already reported', () => {
    const first = trackFindings({}, [finding()], 2);
    const second = trackFindings(first.tracked, [finding({ summary: 'wording changed' })], 2);

    expect(second.added).toEqual([]);
    expect(second.resolved).toEqual([]);
  });

  it('does not call a finding resolved after a single quiet scan', () => {
    const first = trackFindings({}, [finding()], 2);
    const second = trackFindings(first.tracked, [], 2);

    expect(second.resolved).toEqual([]);
    expect(Object.values(second.tracked)[0]?.missedScans).toBe(1);
  });

  it('calls it resolved once it stays away long enough, and forgets it', () => {
    const first = trackFindings({}, [finding()], 2);
    const second = trackFindings(first.tracked, [], 2);
    const third = trackFindings(second.tracked, [], 2);

    expect(third.resolved).toHaveLength(1);
    expect(third.tracked).toEqual({});
  });

  it('does not alert twice for a borderline finding that flickers', () => {
    const first = trackFindings({}, [finding()], 2);
    const gone = trackFindings(first.tracked, [], 2);
    const back = trackFindings(gone.tracked, [finding()], 2);

    expect(back.added).toEqual([]);
    expect(Object.values(back.tracked)[0]?.missedScans).toBe(0);
  });

  it('reports again when a resolved finding comes back', () => {
    let tracker = trackFindings({}, [finding()], 2).tracked;
    tracker = trackFindings(tracker, [], 2).tracked;
    tracker = trackFindings(tracker, [], 2).tracked;

    expect(trackFindings(tracker, [finding()], 2).added).toHaveLength(1);
  });
});

describe('atLeast', () => {
  it('ranks critical above warning', () => {
    expect(atLeast('critical', 'warning')).toBe(true);
    expect(atLeast('warning', 'critical')).toBe(false);
    expect(atLeast('warning', 'warning')).toBe(true);
  });
});
