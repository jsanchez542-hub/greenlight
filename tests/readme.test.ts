import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const documents = [
  { file: 'README.md', lang: 'en', exampleHeading: '## Example' },
  { file: 'README.es.md', lang: 'es', exampleHeading: '## Ejemplo' },
] as const;

const compiled = existsSync('dist/index.js');

/** A working copy on Windows may have CRLF line endings; the repository itself is LF. */
function read(file: string): string {
  return readFileSync(file, 'utf8').split('\r\n').join('\n');
}

function headings(text: string): string[] {
  return [...text.replace(/```[\s\S]*?```/g, '').matchAll(/^##? (.+)$/gm)].map((match) => match[1] as string);
}

function slug(heading: string): string {
  return heading
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/ +/g, '-');
}

describe.each(documents)('$file', ({ file, lang, exampleHeading }) => {
  const readme = read(file);

  it.skipIf(!compiled)('shows exactly what the program prints for the synthetic instance', () => {
    const shown = readme.split(exampleHeading)[1]?.split('```')[1]?.trim();
    const printed = execFileSync(process.execPath, ['examples/synthetic-instance.mjs', '--lang', lang], {
      encoding: 'utf8',
    })
      .split('\r\n')
      .join('\n')
      .trim();

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

  it('only links to sections that exist', () => {
    const anchors = headings(readme).map(slug);
    const wanted = [...readme.matchAll(/\]\(#([^)\s]+)\)/g)].map((match) => match[1] as string);

    expect(wanted.length).toBeGreaterThan(0);
    expect(wanted.filter((anchor) => !anchors.includes(anchor))).toEqual([]);
  });

  it('names only npm scripts that exist', () => {
    const scripts = Object.keys((JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: object }).scripts);
    const named = [...readme.matchAll(/npm run ([a-z:-]+)/g)].map((match) => match[1] as string);

    expect(named.filter((name) => !scripts.includes(name))).toEqual([]);
  });

  it('names only settings that exist', () => {
    const known = readFileSync('src/i18n/en.ts', 'utf8') + readFileSync('src/config.ts', 'utf8');
    const named = [...readme.matchAll(/`(GREENLIGHT_[A-Z_]+)`/g)].map((match) => match[1] as string);

    expect(named.filter((name) => !known.includes(name))).toEqual([]);
  });

  it('keeps the typography rules: no long dashes outside code', () => {
    const prose = readme.replace(/```[\s\S]*?```/g, '');

    expect(prose).not.toMatch(/[–—]/);
  });
});

describe('the two READMEs', () => {
  const english = read('README.md');
  const spanish = read('README.es.md');
  const pick = (text: string, pattern: RegExp): string[] => [...text.matchAll(pattern)].map((match) => match[0]);

  it('have the same sections in the same order', () => {
    expect(headings(spanish).length).toBe(headings(english).length);
  });

  it('show the same images, commands, settings and code blocks', () => {
    expect(pick(spanish, /docs\/images\/[a-z]+\.png/g)).toEqual(pick(english, /docs\/images\/[a-z]+\.png/g));
    expect(pick(spanish, /npm run [a-z:-]+/g)).toEqual(pick(english, /npm run [a-z:-]+/g));
    expect(pick(spanish, /`GREENLIGHT_[A-Z_]+`/g)).toEqual(pick(english, /`GREENLIGHT_[A-Z_]+`/g));
    expect((spanish.match(/```/g) ?? []).length).toBe((english.match(/```/g) ?? []).length);
  });

  it('point at each other', () => {
    expect(english).toContain('(README.es.md)');
    expect(spanish).toContain('(README.md)');
  });
});
