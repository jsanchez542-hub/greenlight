import type { Finding, WorkflowSummary } from 'greenlight';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FindingRow } from '@/components/findings/FindingRow';
import { ConnectionCheck } from '@/components/setup/ConnectionCheck';
import { EvidenceList } from '@/components/ui/EvidenceList';
import { NotInScan } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { WorkflowTable } from '@/components/workflows/WorkflowTable';
import { sampleResult } from '@/lib/sample';
import { decodeSegment, findingHref, workflowHref } from '@/lib/routes';
import { parseScanResult } from '@/lib/scan-result';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

const payloads = [
  '<img src=x onerror=alert(1)>',
  '"><svg onload=alert(1)>',
  '</script><script>alert(1)</script>',
  "'; alert(1); //",
  'javascript:alert(1)',
  '‮evil‬​',
  '<iframe srcdoc="<script>alert(1)</script>">',
  '{{constructor.constructor("alert(1)")()}}',
];

function structure(markup: string): string[] {
  return (markup.match(/<[^>]+>/g) ?? []).map((tag) => tag.replace(/="[^"]*"/g, '=""'));
}

function expectPayloadToChangeNoStructure(render: (text: string) => string, payload: string): void {
  const hostile = render(payload);
  expect(structure(hostile)).toEqual(structure(render('plain text')));
  expect(hostile).not.toMatch(/href="javascript:/i);
}

function html(element: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(element);
}

function finding(text: string): Finding {
  return {
    workflowId: text,
    workflowName: text,
    detector: 'silent-error',
    severity: 'critical',
    summary: text,
    evidence: { [text]: text, node: text },
  };
}

function workflow(text: string): WorkflowSummary {
  return { id: text, name: text, active: true, trigger: 'event', executionsRead: 3, lastStartedAt: null, health: 'healthy' };
}

describe('text from an instance is never rendered as markup', () => {
  for (const payload of payloads) {
    const label = payload.slice(0, 24);

    it(`${label} changes nothing in the finding list`, () => {
      expectPayloadToChangeNoStructure(
        (text) => html(createElement(FindingRow, { entry: { key: 'k', finding: finding(text) } })),
        payload,
      );
    });

    it(`${label} changes nothing in evidence, keys or values`, () => {
      expectPayloadToChangeNoStructure(
        (text) => html(createElement(EvidenceList, { evidence: { [text]: text, node: text } })),
        payload,
      );
    });

    it(`${label} changes nothing in the workflow table`, () => {
      expectPayloadToChangeNoStructure(
        (text) =>
          html(
            createElement(WorkflowTable, {
              workflows: [workflow(text)],
              scannedAt: sampleResult.scannedAt,
              findingCounts: new Map(),
              sort: 'status',
              direction: 'asc',
              onSort: () => undefined,
            }),
          ),
        payload,
      );
    });

    it(`${label} changes nothing in a page title`, () => {
      expectPayloadToChangeNoStructure((text) => html(createElement(PageHeader, { title: text, meta: text })), payload);
    });

    it(`${label} changes nothing in the connection check, where messages come from the instance`, () => {
      expectPayloadToChangeNoStructure(
        (text) =>
          html(
            createElement(ConnectionCheck, {
              status: {
                hasAddress: true,
                hasKey: true,
                diagnosis: {
                  ok: false,
                  host: text,
                  workflowCount: null,
                  steps: [{ id: 'reach' as const, label: text, status: 'failed' as const, detail: text, hint: text }],
                },
              },
            }),
          ),
        payload,
      );
    });

    it(`${label} cannot break out of the text of a notice`, () => {
      expectPayloadToChangeNoStructure(
        (text) => html(createElement(NotInScan, { what: text, backHref: '/findings', backLabel: 'Back' })),
        payload,
      );
    });
  }

  it('shows a hostile summary as the text it is', () => {
    const markup = html(createElement(FindingRow, { entry: { key: 'k', finding: finding(payloads[0] ?? '') } }));
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('does not turn a javascript: summary into a link target', () => {
    const markup = html(createElement(FindingRow, { entry: { key: 'k', finding: finding('javascript:alert(1)') } }));
    expect(markup).not.toMatch(/href="javascript:/i);
    expect(markup).toContain('href="/findings/');
  });
});

describe('identifiers placed in addresses', () => {
  const ids = ['../../etc/passwd', 'a b/c%00', '"><svg onload=alert(1)>', 'x?y=1&z=2#frag', 'back\\slash', '‮​', 'a'.repeat(5000)];
  const unsafe = /[/?#\s"'<>\\]/;

  it('are encoded so they cannot add a segment, a query or a fragment', () => {
    for (const id of ids) {
      expect(workflowHref(id).startsWith('/workflows/')).toBe(true);
      expect(workflowHref(id).slice('/workflows/'.length)).not.toMatch(unsafe);
      expect(findingHref(id).slice('/findings/'.length)).not.toMatch(unsafe);
    }
  });

  it('come back unchanged when the page reads them', () => {
    for (const id of ids) {
      expect(decodeSegment(workflowHref(id).slice('/workflows/'.length))).toBe(id);
    }
  });

  it('are never a way to reach another route', () => {
    expect(workflowHref('../checks')).toBe('/workflows/..%2Fchecks');
  });
});

describe('a scan result full of hostile values', () => {
  function hostileResult() {
    const result = structuredClone(sampleResult) as unknown as {
      workflows: Record<string, unknown>[];
      findings: Record<string, unknown>[];
    };
    result.workflows[0] = { ...result.workflows[0], name: payloads[0], id: payloads[1] };
    result.findings[0] = {
      ...result.findings[0],
      summary: 'x'.repeat(200_000),
      evidence: JSON.parse('{"__proto__": "polluted", "constructor": 1, "toString": "t"}'),
    };
    return result;
  }

  it('is accepted as plain data, however long or strange', () => {
    const parsed = parseScanResult(hostileResult());
    expect(parsed.workflows[0]?.name).toBe(payloads[0]);
    expect(parsed.findings[0]?.summary).toHaveLength(200_000);
  });

  it('cannot reach the prototype of the evidence object', () => {
    const evidence = parseScanResult(hostileResult()).findings[0]?.evidence ?? {};

    expect(Object.getPrototypeOf(evidence)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.keys(evidence)).toEqual(['__proto__', 'constructor', 'toString']);
    expect(Object.getOwnPropertyDescriptor(evidence, '__proto__')?.value).toBe('polluted');
  });

  it('still rejects a value that is not text or a number', () => {
    const result = hostileResult();
    result.findings[0] = { ...result.findings[0], evidence: { node: { nested: '<img src=x>' } } };
    expect(() => parseScanResult(result)).toThrow('evidence.node');
  });
});

describe('the one script written into the page', () => {
  it('is a constant, so nothing from an instance can reach it', () => {
    expect(THEME_INIT_SCRIPT).not.toMatch(/\$\{/);
    expect(THEME_INIT_SCRIPT).not.toContain('innerHTML');
  });
});
