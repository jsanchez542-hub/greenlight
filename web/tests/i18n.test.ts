import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';

type Leaf = string | ((...args: never[]) => string);

function leaves(value: unknown, path: string[] = []): Array<[string, unknown]> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leaves(item, [...path, String(index)]));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => leaves(item, [...path, key]));
  }
  return [[path.join('.'), value]];
}

function shape(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(shape);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]));
  }
  return typeof value === 'function' ? `function/${value.length}` : typeof value;
}

const call = (fn: unknown, args: unknown[]): string => (fn as (...rest: unknown[]) => string)(...args);

interface Sample {
  args: unknown[];
  shows: string[];
}

const samples: Record<string, Sample[]> = {
  'nav.sectionTitle': [{ args: ['LABEL', 'K'], shows: ['LABEL', 'K'] }],
  'sidebar.connectedTitle': [
    { args: ['HOST'], shows: ['HOST'] },
    { args: [null], shows: [] },
  ],
  'theme.systemNow': [{ args: ['NOW'], shows: ['NOW'] }],
  'theme.button': [{ args: ['CUR', 'NEXT'], shows: ['CUR', 'next'] }],
  'age.minutes': [{ args: [7], shows: ['7'] }],
  'age.hours': [{ args: [7], shows: ['7'] }],
  'age.days': [
    { args: [7], shows: ['7'] },
    { args: [1], shows: ['1'] },
  ],
  'age.minutesBefore': [{ args: [7], shows: ['7'] }],
  'age.hoursBefore': [{ args: [7], shows: ['7'] }],
  'age.daysBefore': [{ args: [7], shows: ['7'] }],
  'count.workflows': [
    { args: [7], shows: ['7'] },
    { args: [1], shows: ['1'] },
  ],
  'count.findings': [
    { args: [7], shows: ['7'] },
    { args: [1], shows: ['1'] },
  ],
  'status.severityCount': [
    { args: ['critical', 7], shows: ['7'] },
    { args: ['warning', 1], shows: ['1'] },
  ],
  'scan.lastGood': [
    { args: ['AGE'], shows: ['AGE'] },
    { args: [null], shows: [] },
  ],
  'scan.outOfDate': [{ args: ['AGE'], shows: ['AGE'] }],
  'scan.shouldRefresh': [{ args: [7], shows: ['7'] }],
  'scan.progressBody': [{ args: ['ELAPSED'], shows: ['ELAPSED'] }],
  'scan.notInScanBody': [
    { args: ['finding'], shows: [] },
    { args: ['workflow'], shows: [] },
  ],
  'copy.label': [{ args: ['WHAT'], shows: ['WHAT'] }],
  'copy.done': [{ args: ['WHAT'], shows: ['WHAT'] }],
  'overview.checked': [{ args: [7], shows: ['7'] }],
  'overview.nothingPassed': [
    { args: [7], shows: ['7'] },
    { args: [1], shows: ['1'] },
  ],
  'overview.allFindings': [{ args: [7], shows: ['7'] }],
  'findings.shown': [
    { args: [7, 9], shows: ['7', '9'] },
    { args: [1, 1], shows: ['1'] },
  ],
  'findings.openWorkflow': [{ args: ['NAME'], shows: ['NAME'] }],
  'workflows.shown': [{ args: [7, 9], shows: ['7', '9'] }],
  'workflows.id': [{ args: ['ID'], shows: ['ID'] }],
  'checks.raises': [
    { args: ['critical'], shows: [] },
    { args: ['warning'], shows: [] },
  ],
  'checks.inScan': [{ args: [7], shows: ['7'] }],
  'setup.connectedTo': [
    { args: ['HOST', 7], shows: ['HOST', '7'] },
    { args: ['HOST', 1], shows: ['HOST', '1'] },
  ],
  'updates.available': [{ args: ['9.8.7'], shows: ['9.8.7'] }],
  'tour.position': [{ args: [2, 6], shows: ['2', '6'] }],
  'failures.rateLimited': [{ args: [7], shows: ['7'] }],
  'failures.scanTooSoon': [{ args: [7], shows: ['7'] }],
};

const sameOutput = new Set(['nav.sectionTitle', 'count.workflows', 'workflows.id']);

const functions = leaves(en).filter((entry): entry is [string, Leaf] => typeof entry[1] === 'function');
const strings = leaves(en).filter((entry): entry is [string, string] => typeof entry[1] === 'string');

const sameInBothLanguages = new Set([
  'meta.title',
  'status.no',
  'language.group',
  'language.english',
  'language.spanish',
  'nav.labels.workflows',
  'nav.tabs.workflows',
  'nav.pages.workflows',
  'meta.pages.workflows.title',
  'meta.pages.workflow.title',
  'workflows.title',
  'workflows.columns.name',
  'tour.steps.workflows.title',
]);

describe('the two dictionaries', () => {
  it('have exactly the same shape: every key, every list length and every function arity', () => {
    expect(shape(es)).toEqual(shape(en));
  });

  it('cover every function with a sample, so a new one cannot be left unchecked', () => {
    expect(functions.map(([path]) => path).sort()).toEqual(Object.keys(samples).sort());
  });

  for (const [path] of functions) {
    it(`${path} shows every value it is given, in both languages`, () => {
      const spanish = new Map(leaves(es).map(([key, value]) => [key, value]));
      for (const { args, shows } of samples[path] ?? []) {
        const english = call(leaves(en).find(([key]) => key === path)?.[1], args);
        const translated = call(spanish.get(path), args);
        for (const shown of shows) {
          expect(english.toLowerCase()).toContain(shown.toLowerCase());
          expect(translated.toLowerCase()).toContain(shown.toLowerCase());
        }
        if (!sameOutput.has(path)) {
          expect(translated).not.toBe(english);
        }
        for (const output of [english, translated]) {
          expect(output).not.toMatch(/undefined|NaN|\[object|\$\{/);
        }
      }
    });
  }

  it('leave no Spanish sentence in English unless it is listed as the same in both', () => {
    const spanish = new Map(leaves(es).map(([key, value]) => [key, value]));
    const identical = strings.filter(([path, text]) => spanish.get(path) === text).map(([path]) => path);
    expect(identical.sort()).toEqual([...sameInBothLanguages].sort());
  });

  it('never use a long dash or a dash standing for a pause', () => {
    for (const messages of [en, es]) {
      for (const [path, value] of leaves(messages)) {
        if (typeof value === 'string') {
          expect(value, path).not.toMatch(/[—–]/);
        }
      }
    }
  });

  it('write Spanish questions and exclamations with the opening sign', () => {
    for (const [path, value] of leaves(es)) {
      if (typeof value === 'string') {
        const sentence = value.replace(/\(\?\)| \? /g, ' ');
        expect((sentence.match(/\?/g) ?? []).length, path).toBe((sentence.match(/¿/g) ?? []).length);
        expect((sentence.match(/!/g) ?? []).length, path).toBe((sentence.match(/¡/g) ?? []).length);
      }
    }
  });

  it('keep the glossary: one word for each concept, in every Spanish screen', () => {
    const forbidden: Array<[RegExp, string]> = [
      [/\bescane/i, 'use "analizar" for scan'],
      [/\bscan\b/i, 'use "análisis"'],
      [/\bdashboard\b/i, 'use "panel"'],
      [/\bclave API\b/i, 'use "clave de API"'],
      [/\bapi key\b/i, 'use "clave de API"'],
      [/\bchequeo/i, 'use "comprobación"'],
      [/\bfindings?\b/i, 'use "hallazgo"'],
      [/\bdescubrimiento/i, 'use "hallazgo"'],
      [/\bflujos? de trabajo\b/i, 'workflow is not translated'],
      [/\bhistorial de ejecución\b/i, 'use "historial de ejecuciones"'],
    ];
    const allowed = new Set([
      'setup.form.keyHelpLink',
      'meta.description',
      'overview.watchBody',
      'setup.terminalBody',
    ]);
    for (const [path, value] of leaves(es)) {
      if (typeof value !== 'string' || allowed.has(path)) {
        continue;
      }
      for (const [pattern, advice] of forbidden) {
        expect(value, `${path}: ${advice}`).not.toMatch(pattern);
      }
    }
  });

  it('use the same name for a concept in the English one too', () => {
    for (const [path, value] of leaves(en)) {
      if (typeof value === 'string') {
        expect(value, path).not.toMatch(/\bdashboard\b.*\bpanel\b|\bscanning\b.*\banalysis\b/i);
      }
    }
  });
});
