import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readme = readFileSync('README.md', 'utf8');
const compiled = existsSync('dist/index.js');

describe('README', () => {
  it.skipIf(!compiled)('shows exactly what the program prints for the synthetic instance', () => {
    const shown = readme.split('## Example')[1]?.split('```')[1]?.trim();
    const printed = execFileSync(process.execPath, ['examples/synthetic-instance.mjs'], { encoding: 'utf8' }).trim();

    expect(shown).toBe(printed);
  });

  it('only links to files that exist', () => {
    const links = [
      ...readme.matchAll(/\]\((?!https?:\/\/|#|mailto:)([^)\s]+)\)/g),
      ...readme.matchAll(/src="(?!https?:\/\/)([^"]+)"/g),
    ].map((match) => match[1] as string);

    const missing = links.filter((link) => !existsSync(link));

    expect(links.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it('names only npm scripts that exist', () => {
    const scripts = Object.keys((JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: object }).scripts);
    const named = [...readme.matchAll(/npm run ([a-z:-]+)/g)].map((match) => match[1] as string);

    expect(named.filter((name) => !scripts.includes(name))).toEqual([]);
  });
});
