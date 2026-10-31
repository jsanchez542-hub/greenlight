// Checks the packaged program against a real n8n.
//
// It installs the tarball in an empty folder, puts workflows with known behaviour on the n8n it is
// pointed at, scans it with a key that can only read, and checks that the API answers the way the
// scan relies on and that the scan finds what it should and nothing else.
//
//   node e2e/run.mjs --url http://127.0.0.1:5678 --package greenlight-n8n-1.2.3.tgz [--n8n 2.45.7]
//
// The instance has to be a throwaway one on this machine: see guard.mjs.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertThrowawayInstance } from './guard.mjs';
import { createApiKey, createOwner, readVersion, seedWorkflows, waitUntilReady } from './seed.mjs';

// What a scan needs from a key, and nothing more.
const SCAN_SCOPES = ['workflow:list', 'workflow:read', 'execution:list', 'execution:read'];

function option(name) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

let baseUrl;
try {
  baseUrl = assertThrowawayInstance(option('url') ?? '');
} catch (error) {
  process.stderr.write(`${error.message}\nUsage: node e2e/run.mjs --url http://127.0.0.1:5678 --package <tarball> [--n8n <version>]\n`);
  process.exit(2);
}
if (option('package') === undefined) {
  process.stderr.write('Usage: node e2e/run.mjs --url http://127.0.0.1:5678 --package <tarball> [--n8n <version>]\n');
  process.exit(2);
}
const tarball = resolve(option('package'));
const expectedVersion = option('n8n');
const windows = process.platform === 'win32';

// Nothing from the machine that runs this may reach the program under test.
const cleanEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !/^(N8N_|GREENLIGHT_|npm_)/i.test(name)),
);

function run(command, args, { cwd, env = {} }) {
  return new Promise((done) => {
    const child = spawn(command, args, { cwd, env: { ...cleanEnvironment, ...env }, shell: windows, stdio: ['ignore', 'pipe', 'pipe'] });
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
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : `\n      ${String(detail).slice(0, 500)}`}\n`);
}

const project = mkdtempSync(join(tmpdir(), 'greenlight-e2e-'));

try {
  writeFileSync(join(project, 'package.json'), '{ "name": "e2e", "version": "0.0.0", "private": true }\n');
  const install = await run('npm', ['install', windows ? `"${tarball}"` : tarball, '--no-audit', '--no-fund'], { cwd: project });
  note('the package installs', install.code === 0, install.stderr);

  await waitUntilReady(baseUrl);
  const owner = await createOwner(baseUrl);
  const version = await readVersion(baseUrl, owner);
  process.stdout.write(`n8n ${version ?? '(version not reported)'} at ${baseUrl}\n`);
  if (expectedVersion !== undefined) {
    note(`the instance is the n8n ${expectedVersion} that was asked for`, version === expectedVersion, `it says ${version}`);
  }

  const admin = await createApiKey(baseUrl, owner, { label: 'seeding' });
  const seeded = await seedWorkflows(baseUrl, admin.key);
  const reader = await createApiKey(baseUrl, owner, { label: 'greenlight', only: (scope) => SCAN_SCOPES.includes(scope) });
  note('a key with only the four scopes a scan needs exists', reader.scopes.length === SCAN_SCOPES.length, reader.scopes.join(', '));

  const refused = await fetch(`${baseUrl}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': reader.key, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'must not exist', nodes: [], connections: {}, settings: {} }),
  });
  note('that key really cannot write', refused.status === 401 || refused.status === 403, `it got ${refused.status}`);

  // What the scan relies on from the API, read with the same client the program uses.
  const { N8nClient } = await import(pathToFileURL(join(project, 'node_modules', 'greenlight-n8n', 'dist', 'index.js')).href);
  const client = new N8nClient({ baseUrl, apiKey: reader.key });
  const byKey = Object.fromEntries(seeded.map((workflow) => [workflow.key, workflow]));

  const listed = await client.listWorkflows();
  note(
    'the workflows are listed with their name and whether they are on',
    seeded.every((workflow) => listed.some((item) => item.id === workflow.id && item.name === workflow.name && item.active === true)),
    JSON.stringify(listed.map(({ id, name, active }) => ({ id, name, active }))),
  );

  const detail = await client.getWorkflow(byKey.silent.id);
  note('a workflow comes with the type of each of its nodes', detail.nodes.some((node) => node.type === 'n8n-nodes-base.webhook') && detail.nodes.some((node) => node.type === 'n8n-nodes-base.httpRequest'), JSON.stringify(detail.nodes?.map((node) => node.type)));

  const executions = await client.listExecutions({ workflowId: byKey.silent.id, limit: 200 });
  note(
    'its runs come with their status and their times, newest first',
    executions.length === byKey.silent.calls &&
      executions.every((execution) => execution.status === 'success' && Number.isFinite(Date.parse(execution.startedAt)) && Number.isFinite(Date.parse(execution.stoppedAt ?? ''))) &&
      executions.every((execution, index) => index === 0 || Date.parse(executions[index - 1].startedAt) >= Date.parse(execution.startedAt)),
    JSON.stringify(executions.slice(0, 2)),
  );

  const first = await client.getExecution(executions[0].id);
  const items = first.data?.resultData?.runData?.['Send receipt']?.[0]?.data?.main?.[0] ?? [];
  const carried = items[0]?.json?.error;
  note(
    'a run comes with what each node produced, including the error that did not stop it',
    items.length > 0 && (typeof carried === 'string' || typeof carried?.message === 'string'),
    JSON.stringify(first.data?.resultData?.runData ?? null)?.slice(0, 300),
  );

  // The program as a person runs it.
  const scanned = await run('npx', ['--no-install', 'greenlight-n8n', '--json'], {
    cwd: project,
    env: { N8N_BASE_URL: baseUrl, N8N_API_KEY: reader.key },
  });
  let result = null;
  try {
    result = JSON.parse(scanned.stdout);
  } catch {
    // reported below
  }
  note('the scan prints its result and exits with 1 because it found something', scanned.code === 1 && result !== null, `${scanned.code} ${scanned.stderr}`);
  note('it read every workflow of the instance', result?.version === 1 && result.workflowsScanned === seeded.length, `${result?.workflowsScanned}`);

  for (const workflow of seeded) {
    const summary = result?.workflows.find((item) => item.id === workflow.id);
    note(
      `${workflow.name}: health ${workflow.expect.health}, triggered by ${workflow.expect.trigger === 'event' ? 'an event' : 'a clock'}`,
      summary?.health === workflow.expect.health && summary?.trigger === workflow.expect.trigger,
      JSON.stringify(summary),
    );
  }

  const expectedFindings = seeded.filter((workflow) => workflow.expect.finding !== null);
  const findings = result?.findings ?? [];
  note('it found exactly what was planted and nothing else', findings.length === expectedFindings.length, JSON.stringify(findings.map((finding) => [finding.workflowName, finding.detector])));
  for (const workflow of expectedFindings) {
    const finding = findings.find((item) => item.workflowId === workflow.id);
    note(
      `${workflow.name}: a ${workflow.expect.finding.severity} ${workflow.expect.finding.detector} on ${workflow.expect.finding.node}`,
      finding?.detector === workflow.expect.finding.detector && finding?.severity === workflow.expect.finding.severity && finding?.evidence?.node === workflow.expect.finding.node,
      JSON.stringify(finding),
    );
  }
} catch (error) {
  note('the check ran to the end', false, error?.stack ?? error);
} finally {
  rmSync(project, { recursive: true, force: true });
}

const failed = results.filter((ok) => !ok).length;
process.stdout.write(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exitCode = failed === 0 ? 0 : 1;
