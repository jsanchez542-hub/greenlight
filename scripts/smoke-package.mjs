// Installs a packed tarball in an empty folder, the way a person would, and uses it: the version,
// the help, a scan, the connection check and one round of watch against the invented instance that
// scripts/synthetic-server.mjs serves on this machine. It also checks that the scan only read.
//
//   node scripts/check-package.mjs --out some/folder    # makes the tarball
//   node scripts/smoke-package.mjs some/folder/greenlight-n8n-1.2.3.tgz

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnCommand } from './spawn.mjs';
import { startSyntheticServer } from './synthetic-server.mjs';

const tarballArgument = process.argv[2];
if (tarballArgument === undefined) {
  process.stderr.write('Usage: node scripts/smoke-package.mjs <package.tgz>\n');
  process.exit(2);
}
const tarball = resolve(tarballArgument);
const KEY = 'smoke-test-key';

// Nothing from the machine that runs this may reach the program under test.
const baseEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !/^(N8N_|GREENLIGHT_|npm_)/i.test(name)),
);

function run(command, args, { cwd, env = {} }) {
  return new Promise((done) => {
    const child = spawnCommand(command, args, {
      cwd,
      env: { ...baseEnvironment, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => done({ code, stdout, stderr }));
  });
}

const results = [];
function note(name, ok, detail = '') {
  results.push(ok);
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : `\n      ${detail.slice(0, 400)}`}\n`);
}

const project = mkdtempSync(join(tmpdir(), 'greenlight-smoke-'));
let server;

try {
  writeFileSync(join(project, 'package.json'), '{ "name": "smoke", "version": "0.0.0", "private": true }\n');

  const install = await run('npm', ['install', tarball, '--no-audit', '--no-fund', '--foreground-scripts'], {
    cwd: project,
  });
  note('the tarball installs', install.code === 0, install.stderr);
  note(
    'installing it runs no script of its own',
    !/^> greenlight-n8n@/m.test(install.stdout + install.stderr),
    install.stdout + install.stderr,
  );

  const installed = join(project, 'node_modules', 'greenlight-n8n');
  const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
  note('only the built program is installed', existsSync(join(installed, 'dist', 'cli.js')) && !existsSync(join(installed, 'src')));

  for (const command of ['greenlight-n8n', 'greenlight']) {
    const version = await run('npx', ['--no-install', command, '--version'], { cwd: project });
    note(`${command} --version prints ${manifest.version}`, version.code === 0 && version.stdout.trim() === manifest.version, version.stdout + version.stderr);
  }

  const help = await run('npx', ['--no-install', 'greenlight-n8n', '--help'], { cwd: project });
  note('the help names the command the person typed', help.code === 0 && help.stdout.includes('npx greenlight-n8n init'), help.stdout);

  const unconfigured = await run('npx', ['--no-install', 'greenlight-n8n'], { cwd: project });
  note(
    'without settings it exits with 2 and says what to type',
    unconfigured.code === 2 && unconfigured.stderr.includes('npx greenlight-n8n init'),
    `${unconfigured.code} ${unconfigured.stderr}`,
  );

  server = await startSyntheticServer({ key: KEY });
  const connection = { N8N_BASE_URL: server.url, N8N_API_KEY: KEY };

  const scanned = await run('npx', ['--no-install', 'greenlight-n8n', '--json'], { cwd: project, env: connection });
  let result = null;
  try {
    result = JSON.parse(scanned.stdout);
  } catch {
    // reported below
  }
  note('a scan prints the result as JSON and exits with 1 because it found something', scanned.code === 1 && result !== null, `${scanned.code} ${scanned.stderr}`);
  note('the scan read all eighteen workflows', result?.version === 1 && result.workflowsScanned === 18, JSON.stringify(result)?.slice(0, 200));
  const detectors = new Set(result?.findings.map((finding) => finding.detector));
  note(
    'it found what each of the four checks is built to find',
    ['silent-error', 'duration-drift', 'silence', 'frequency-drop'].every((name) => detectors.has(name)) && result.findings.length === 4,
    [...detectors].join(', '),
  );
  note(
    'it only read: every request was a GET and carried the key',
    server.requests.length > 100 && server.requests.every((request) => request.method === 'GET' && request.authorised),
    JSON.stringify(server.requests.filter((request) => request.method !== 'GET' || !request.authorised).slice(0, 3)),
  );

  const doctor = await run('npx', ['--no-install', 'greenlight-n8n', 'doctor'], { cwd: project, env: connection });
  note('the connection check passes', doctor.code === 0, `${doctor.code} ${doctor.stdout}`);

  const watched = await run('npx', ['--no-install', 'greenlight-n8n', 'watch', '--once'], { cwd: project, env: connection });
  note('one round of watch reports the new findings', watched.code === 1 && /NEW /.test(watched.stdout), `${watched.code} ${watched.stdout} ${watched.stderr}`);

  const stray = await run('npm', ['ls', '--all', '--parseable'], { cwd: project });
  note('nothing else was installed with it', stray.stdout.trim().split('\n').length === 2, stray.stdout);
} catch (error) {
  note('the check ran to the end', false, String(error?.stack ?? error));
} finally {
  await server?.close();
  rmSync(project, { recursive: true, force: true });
}

const failed = results.filter((ok) => !ok).length;
process.stdout.write(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exitCode = failed === 0 ? 0 : 1;
