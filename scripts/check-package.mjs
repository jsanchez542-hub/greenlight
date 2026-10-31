// Packs the package exactly as it would be published and checks the result against the rules in
// package-rules.mjs. It fails with every broken rule, and otherwise prints where the tarball is.
//
//   npm run build
//   node scripts/check-package.mjs --out some/folder
//
// Inside GitHub Actions it also writes `tarball` and `sha256` to the outputs of the step.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, openSync, readFileSync, readSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkPackage } from './package-rules.mjs';

const outIndex = process.argv.indexOf('--out');
const outDirectory = resolve(outIndex === -1 ? '.' : (process.argv[outIndex + 1] ?? '.'));
mkdirSync(outDirectory, { recursive: true });

// The build has already run: the tarball must hold what was built and tested, so no script is
// allowed to rebuild it here.
const packed = spawnSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', outDirectory], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
if (packed.status !== 0) {
  process.stderr.write(`npm pack failed:\n${packed.stderr}\n`);
  process.exit(1);
}

const [report] = JSON.parse(packed.stdout);
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));

const cli = openSync('dist/cli.js', 'r');
const head = Buffer.alloc(64);
readSync(cli, head, 0, head.length, 0);
closeSync(cli);

const problems = checkPackage(
  { files: report.files.map((file) => file.path), size: report.size, unpackedSize: report.unpackedSize },
  manifest,
  head.toString('utf8'),
);

if (problems.length > 0) {
  process.stderr.write(`The package does not pass:\n${problems.map((problem) => `  - ${problem}`).join('\n')}\n`);
  process.exit(1);
}

const tarball = resolve(outDirectory, report.filename);
const sha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');

process.stdout.write(
  `${report.name}@${report.version}: ${report.entryCount} files, ${report.size} bytes packed, ${report.unpackedSize} unpacked.\n` +
    `${tarball}\nsha256 ${sha256}\n`,
);

if (process.env['GITHUB_OUTPUT'] !== undefined) {
  appendFileSync(process.env['GITHUB_OUTPUT'], `tarball=${tarball}\nsha256=${sha256}\nversion=${report.version}\n`);
}
