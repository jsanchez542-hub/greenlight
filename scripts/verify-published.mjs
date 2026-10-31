// After a release: waits until the version can be installed from npm, installs it in an empty
// folder and checks that npm verifies its signature and its provenance, and that it runs.
//
//   node scripts/verify-published.mjs 1.2.3

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnCommandSync } from './spawn.mjs';

// `--package` points the same checks at another package, which is how they are tried before a release.
const packageFlag = process.argv.indexOf('--package');
const PACKAGE = packageFlag === -1 ? 'greenlight-n8n' : (process.argv[packageFlag + 1] ?? '');
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version ?? '') || !/^(@[a-z0-9-]+\/)?[a-z0-9._-]+$/.test(PACKAGE)) {
  process.stderr.write('Usage: node scripts/verify-published.mjs <version> [--package <name>]\n');
  process.exit(2);
}

const run = (args, cwd) => spawnCommandSync('npm', args, { cwd, encoding: 'utf8' });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
};

// The registry can take a few minutes to serve a version that was just published.
let listed = false;
for (let attempt = 1; attempt <= 20 && !listed; attempt += 1) {
  listed = run(['view', `${PACKAGE}@${version}`, 'version']).stdout.trim() === version;
  if (!listed) {
    process.stdout.write(`${PACKAGE}@${version} is not on the registry yet (attempt ${attempt} of 20).\n`);
    await sleep(15_000);
  }
}

const project = mkdtempSync(join(tmpdir(), 'greenlight-published-'));
try {
  if (!listed) {
    fail(`${PACKAGE}@${version} did not appear on the registry.`);
  } else {
    writeFileSync(join(project, 'package.json'), '{ "name": "check", "version": "0.0.0", "private": true }\n');

    const install = run(['install', `${PACKAGE}@${version}`, '--no-audit', '--no-fund'], project);
    if (install.status !== 0) {
      fail(`Could not install ${PACKAGE}@${version}:\n${install.stderr}`);
    } else {
      const signatures = run(['audit', 'signatures'], project);
      process.stdout.write(signatures.stdout);
      if (signatures.status !== 0) {
        fail(`npm could not verify the signatures:\n${signatures.stderr}`);
      } else if (!/verified (registry )?signature/i.test(signatures.stdout) || !/verified attestation/i.test(signatures.stdout)) {
        fail('npm did not report a verified signature and a verified provenance attestation for the package.');
      }

      const ran = spawnCommandSync('npx', ['--no-install', PACKAGE, '--version'], { cwd: project, encoding: 'utf8' });
      if (ran.status !== 0 || ran.stdout.trim() !== version) {
        fail(`${PACKAGE} --version printed "${ran.stdout.trim()}" instead of ${version}.`);
      }
    }
  }
} finally {
  rmSync(project, { recursive: true, force: true });
}

if (process.exitCode === undefined) {
  process.stdout.write(`${PACKAGE}@${version} is on npm, with verified signature and provenance, and it runs.\n`);
}
