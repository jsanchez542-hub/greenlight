import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { auditDemo } from './demo-audit.mjs';
import { withPolicy } from './demo-policy.mjs';
import { addFlatSegmentNames } from './demo-segments.mjs';

const root = path.resolve(import.meta.dirname, '..');
const exported = path.join(root, '.next-demo');
const output = path.join(root, 'out');
const regular = path.join(root, '.next');
const parked = path.join(root, '.next-parked');

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return htmlFiles(full);
    }
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

function build() {
  const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
  const result = spawnSync(process.execPath, [next, 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, GREENLIGHT_STATIC_DEMO: '1' },
  });
  return result.status === 0;
}

/**
 * The export is built beside the real dashboard, whose own build must come out of this
 * untouched. Next writes its working files to the same folder in both builds, so the real one is
 * put aside for the time it takes and put back whatever happens.
 */
function buildBesideTheRealOne() {
  rmSync(parked, { recursive: true, force: true });
  const hadRegular = existsSync(regular);
  if (hadRegular) {
    renameSync(regular, parked);
  }
  try {
    return build();
  } finally {
    rmSync(regular, { recursive: true, force: true });
    if (hadRegular) {
      renameSync(parked, regular);
    }
  }
}

function finish() {
  rmSync(output, { recursive: true, force: true });
  cpSync(exported, output, { recursive: true });
  rmSync(exported, { recursive: true, force: true });
  for (const page of htmlFiles(output)) {
    writeFileSync(page, withPolicy(readFileSync(page, 'utf8')));
  }
  addFlatSegmentNames(output);
  writeFileSync(path.join(output, '.nojekyll'), '');
}

rmSync(exported, { recursive: true, force: true });
if (!buildBesideTheRealOne()) {
  process.stderr.write('The demo could not be built.\n');
  process.exit(1);
}
if (!existsSync(exported) || !statSync(exported).isDirectory()) {
  process.stderr.write('The build finished but left no exported pages.\n');
  process.exit(1);
}

finish();

const { problems, files } = auditDemo(output);
if (problems.length > 0) {
  process.stderr.write(`The demo is not clean (${problems.length} problems):\n`);
  for (const problem of problems) {
    process.stderr.write(`  ${problem}\n`);
  }
  rmSync(output, { recursive: true, force: true });
  process.exit(1);
}
process.stdout.write(`The demo is in ${path.relative(process.cwd(), output) || '.'} (${files} files), and the audit found nothing.\n`);
