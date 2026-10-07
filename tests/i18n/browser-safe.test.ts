import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const folder = 'src/i18n';

describe('greenlight/i18n', () => {
  it('can be imported by a browser: no Node module and no runtime import from outside the folder', () => {
    for (const file of readdirSync(folder).filter((name) => name.endsWith('.ts'))) {
      const source = readFileSync(`${folder}/${file}`, 'utf8');
      const imports = [...source.matchAll(/^import\s+(type\s+)?[^;]*?from\s+'([^']+)'/gms)];

      for (const [, typeOnly, target] of imports) {
        expect(target, `${file} imports ${target}`).not.toMatch(/^node:/);
        if (typeOnly === undefined) {
          expect(target, `${file} imports ${target} at runtime`).toMatch(/^\.\/[a-z]+\.js$/);
        }
      }
    }
  });

  it('is exported as its own entry point', () => {
    const exported = (JSON.parse(readFileSync('package.json', 'utf8')) as { exports: Record<string, unknown> }).exports;

    expect(Object.keys(exported)).toContain('./i18n');
  });
});
