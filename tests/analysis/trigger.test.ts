import { describe, expect, it } from 'vitest';
import { runsOnAClock } from '../../src/analysis/trigger.js';

describe('runsOnAClock', () => {
  it('recognises a schedule trigger', () => {
    expect(runsOnAClock([{ name: 'Every hour', type: 'n8n-nodes-base.scheduleTrigger' }])).toBe(true);
  });

  it('recognises the older cron node', () => {
    expect(runsOnAClock([{ name: 'Nightly', type: 'n8n-nodes-base.cron' }])).toBe(true);
  });

  it('rejects a webhook, whose idle time carries no meaning', () => {
    expect(runsOnAClock([{ name: 'Form', type: 'n8n-nodes-base.webhook' }])).toBe(false);
  });

  it('rejects polling triggers, which only record a run when they find something', () => {
    const gmail = {
      name: 'Gmail Trigger',
      type: 'n8n-nodes-base.gmailTrigger',
      parameters: { pollTimes: { item: [{ mode: 'everyMinute' }] } },
    };

    expect(runsOnAClock([gmail])).toBe(false);
  });

  it('is satisfied when any node in the workflow is a clock', () => {
    expect(
      runsOnAClock([
        { name: 'Form', type: 'n8n-nodes-base.webhook' },
        { name: 'Nightly', type: 'n8n-nodes-base.scheduleTrigger' },
      ]),
    ).toBe(true);
  });

  describe('with nodes it cannot trust', () => {
    it.each([
      ['missing', undefined],
      ['null', null],
      ['text', 'n8n-nodes-base.scheduleTrigger'],
      ['an object', { 0: { name: 'Nightly', type: 'n8n-nodes-base.scheduleTrigger' } }],
    ])('does not take a workflow whose nodes are %s to run on a clock', (_shape, nodes) => {
      expect(runsOnAClock(nodes)).toBe(false);
    });

    it('skips what is not shaped like a node and still reads the rest', () => {
      const odd = [null, 'text', 5, { name: 'No type' }, { name: 'Type that is not text', type: 7 }];

      expect(runsOnAClock(odd)).toBe(false);
      expect(runsOnAClock([...odd, { name: 'Nightly', type: 'n8n-nodes-base.scheduleTrigger' }])).toBe(true);
    });
  });
});
