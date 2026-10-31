import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME, REPOSITORY_URL, checkPackage, type PackReport } from '../scripts/package-rules.mjs';

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as Record<string, unknown> & {
  scripts: Record<string, string>;
  bin: Record<string, string>;
};
const shebang = '#!/usr/bin/env node\nimport { main } from "./main.js";\n';

const shipped = [
  'package.json',
  'README.md',
  'README.es.md',
  'LICENSE',
  'CHANGELOG.md',
  'dist/cli.js',
  'dist/cli.d.ts',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/i18n/index.js',
  'dist/i18n/index.d.ts',
];

const pack = (files: string[] = shipped, size = 60_000, unpackedSize = 190_000): PackReport => ({ files, size, unpackedSize });
const problems = (changes: Record<string, unknown> = {}, report = pack(), cli = shebang): string[] =>
  checkPackage(report, { ...manifest, ...changes }, cli);

describe('the package that gets published', () => {
  it('passes with the manifest of this repository and the files that are meant to ship', () => {
    expect(problems()).toEqual([]);
    expect(manifest.name).toBe(PACKAGE_NAME);
  });

  it.each([
    'src/scan.ts',
    'tests/scan.test.ts',
    'web/package.json',
    'examples/synthetic-instance.mjs',
    'scripts/check-package.mjs',
    '.github/workflows/ci.yml',
    '.env',
    'dist/.env.local',
    'dist/cli.js.map',
    'node_modules/vitest/index.js',
    '.greenlight-state.json',
    'notes.txt',
  ])('refuses a package that would include %s', (path) => {
    expect(problems({}, pack([...shipped, path])).join('\n')).toContain(path);
  });

  it.each(['package.json', 'LICENSE', 'dist/cli.js', 'dist/index.js', 'dist/index.d.ts', 'dist/i18n/index.js'])(
    'refuses a package without %s',
    (path) => {
      expect(problems({}, pack(shipped.filter((file) => file !== path))).join('\n')).toContain(`missing ${path}`);
    },
  );

  it.each(['preinstall', 'install', 'postinstall'])('refuses the %s script, which runs where the package is installed', (hook) => {
    expect(problems({ scripts: { ...manifest.scripts, [hook]: 'node something.js' } }).join('\n')).toContain(`"${hook}"`);
  });

  it('keeps the build on prepare, which runs in a clone and never when installing from the registry', () => {
    expect(manifest.scripts['prepare']).toBe('npm run build');
    expect(problems({ scripts: { prepare: 'npm run build' } })).toEqual([]);
  });

  it.each(['dependencies', 'optionalDependencies', 'peerDependencies'])('refuses %s, because it ships with none', (field) => {
    expect(problems({ [field]: { left: '^1.0.0' } }).join('\n')).toContain(field);
    expect(problems({ [field]: {} })).toEqual([]);
  });

  it('needs both commands to run the program', () => {
    expect(manifest.bin).toEqual({ 'greenlight-n8n': 'dist/cli.js', greenlight: 'dist/cli.js' });
    expect(problems({ bin: { greenlight: 'dist/cli.js' } }).join('\n')).toContain('greenlight-n8n must run');
    expect(problems({ bin: { 'greenlight-n8n': 'dist/other.js', greenlight: 'dist/cli.js' } }).join('\n')).toContain('dist/other.js');
  });

  it('needs the program to start with a shebang that ends in a plain line feed', () => {
    expect(problems({}, pack(), '#!/usr/bin/env node\r\nimport').join('\n')).toContain('plain line feed');
    expect(problems({}, pack(), 'import "./main.js";\n').join('\n')).toContain('#!/usr/bin/env node');
  });

  it('needs what provenance is checked against', () => {
    expect(manifest.repository).toEqual({ type: 'git', url: REPOSITORY_URL });
    expect(problems({ repository: { type: 'git', url: 'git+https://github.com/someone/else.git' } }).join('\n')).toContain('repository.url');
    expect(problems({ publishConfig: { access: 'public' } }).join('\n')).toContain('provenance');
    expect(problems({ publishConfig: { provenance: true } }).join('\n')).toContain('public');
  });

  it('refuses a package that has grown far beyond its size', () => {
    expect(problems({}, pack(shipped, 400_000)).join('\n')).toContain('packed');
    expect(problems({}, pack(shipped, 60_000, 900_000)).join('\n')).toContain('unpacked');
  });

  it.skipIf(!existsSync('dist/cli.js'))('passes for the package npm would really make right now', () => {
    const [report] = JSON.parse(
      execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
        encoding: 'utf8',
        shell: process.platform === 'win32',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    ) as Array<{ files: Array<{ path: string }>; size: number; unpackedSize: number }>;

    expect(report).toBeDefined();
    expect(
      checkPackage(
        {
          files: (report?.files ?? []).map((file) => file.path),
          size: report?.size ?? 0,
          unpackedSize: report?.unpackedSize ?? 0,
        },
        manifest,
        readFileSync('dist/cli.js', 'utf8').slice(0, 64),
      ),
    ).toEqual([]);
  });
});
