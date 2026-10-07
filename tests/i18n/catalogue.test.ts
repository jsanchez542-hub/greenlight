import { describe, expect, it } from 'vitest';
import { messagesFor, languages } from '../../src/i18n/index.js';

type Node = string | string[] | ((...args: never[]) => string) | { [key: string]: Node };

function shape(node: Node): unknown {
  if (typeof node === 'string') {
    return 'string';
  }
  if (Array.isArray(node)) {
    return node.map(() => 'string');
  }
  if (typeof node === 'function') {
    return `function/${node.length}`;
  }
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, shape(value)]));
}

function strings(node: Node, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node);
  } else if (Array.isArray(node)) {
    out.push(...node);
  } else if (typeof node === 'object') {
    Object.values(node).forEach((value) => strings(value, out));
  }
  return out;
}

const probes = (count: number): (number | string)[] =>
  Array.from({ length: count }, (_, index) => (index === 0 ? 3 : `probe${index}`));

/** Calls every message function with a number first and recognisable text after it. */
function called(node: Node, out: { text: string; args: (number | string)[] }[] = []) {
  if (typeof node === 'function') {
    const args = probes(node.length);
    out.push({ text: (node as (...values: unknown[]) => string)(...args), args });
  } else if (typeof node === 'object' && !Array.isArray(node)) {
    Object.values(node).forEach((value) => called(value as Node, out));
  }
  return out;
}

const catalogue = (lang: (typeof languages)[number]): Node => messagesFor(lang) as unknown as Node;

describe('message catalogues', () => {
  it('have exactly the same sentences in every language', () => {
    const [first, ...others] = languages;
    for (const other of others) {
      expect(shape(catalogue(other))).toEqual(shape(catalogue(first)));
    }
  });

  it('use the same arguments in every language', () => {
    const english = called(catalogue('en'));
    for (const lang of languages) {
      const other = called(catalogue(lang));
      expect(other.length).toBe(english.length);
      other.forEach((entry, index) => {
        for (const argument of entry.args.slice(1)) {
          expect(entry.text.includes(String(argument)), `${lang}: ${entry.text}`).toBe(
            (english[index] as { text: string }).text.includes(String(argument)),
          );
        }
      });
    }
  });

  it('keep the typography rules: no long dashes', () => {
    for (const lang of languages) {
      for (const text of [...strings(catalogue(lang)), ...called(catalogue(lang)).map((entry) => entry.text)]) {
        expect(text, text).not.toMatch(/[–—]/);
      }
    }
  });

  it('write Spanish questions with both signs', () => {
    for (const text of [...strings(catalogue('es')), ...called(catalogue('es')).map((entry) => entry.text)]) {
      expect(text.split('¿').length, text).toBe(text.split('?').length);
    }
  });
});
