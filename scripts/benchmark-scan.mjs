// Times a scan of an invented instance whose every answer takes a fixed time to arrive, so the
// effect of reading several workflows at once can be measured without touching a real n8n.
// The instance lives in memory; nothing is sent over the network.
//
//   npm run build
//   npm run benchmark                                  # 500 workflows, 25 ms per request, 1 2 4 8 16 at once
//   node scripts/benchmark-scan.mjs --workflows 100 --latency 10 --concurrency 1,4
//   node scripts/benchmark-scan.mjs --dist path/to/another/dist    # time another build, to compare versions
//   node scripts/benchmark-scan.mjs --json                         # the same figures as JSON

import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NOW = new Date('2026-03-02T09:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

function positiveInteger(name, raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--${name} must be a positive whole number, received "${raw}".`);
  }
  return value;
}

const workflowCount = positiveInteger('workflows', option('workflows', '500'));
const latencyMs = Number(option('latency', '25'));
if (!Number.isFinite(latencyMs) || latencyMs < 0) {
  throw new Error(`--latency must be zero or more milliseconds, received "${option('latency', '')}".`);
}
const levels = option('concurrency', '1,2,4,8,16').split(',').map((raw) => positiveInteger('concurrency', raw.trim()));
const distFolder = option('dist') === undefined ? fileURLToPath(new URL('../dist/', import.meta.url)) : resolve(option('dist'));
const asJson = process.argv.includes('--json');

const { N8nClient, scan, MAX_CONCURRENCY } = await import(pathToFileURL(join(distFolder, 'index.js')).href);

// A build from before the setting existed reads one workflow at a time whatever it is asked.
const hasConcurrency = MAX_CONCURRENCY !== undefined;

function instance(count) {
  const workflows = [];
  const byWorkflow = new Map();
  const byId = new Map();

  for (let index = 0; index < count; index += 1) {
    const id = `wf-${index}`;
    const onAClock = index % 2 === 0;
    const type = onAClock ? 'n8n-nodes-base.scheduleTrigger' : 'n8n-nodes-base.webhook';
    workflows.push({
      id,
      name: `Workflow ${String(index).padStart(4, '0')}`,
      active: index % 17 !== 0,
      nodes: [{ name: onAClock ? 'Schedule' : 'Webhook', type }],
    });

    // One workflow in five has never run; the others hold between 30 and 149 runs.
    const runs = index % 5 === 4 ? 0 : 30 + ((index * 37) % 120);
    const failing = index % 10 === 3;
    const list = Array.from({ length: runs }, (_, run) => {
      const startedAt = NOW.getTime() - run * HOUR;
      const execution = {
        id: `${id}-${run}`,
        workflowId: id,
        status: 'success',
        startedAt: new Date(startedAt).toISOString(),
        stoppedAt: new Date(startedAt + 800 + ((run * 53) % 400)).toISOString(),
      };
      byId.set(execution.id, { ...execution, failing });
      return execution;
    });
    byWorkflow.set(id, list);
  }

  return { workflows, byWorkflow, byId };
}

function detailOf({ failing, ...execution }) {
  const output = failing ? { error: 'Request failed with status code 401' } : { id: `${execution.id}-out` };
  return {
    ...execution,
    data: { resultData: { runData: { Process: [{ data: { main: [[{ json: output }]] } }] } } },
  };
}

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function fakeFetch(world, delayMs, counter) {
  return async (input) => {
    counter.requests += 1;
    if (delayMs > 0) {
      await new Promise((done) => setTimeout(done, delayMs));
    }

    const url = new URL(String(input));
    const path = url.pathname;
    if (path === '/api/v1/workflows') {
      return respond({ data: world.workflows.map(({ id, name, active }) => ({ id, name, active })), nextCursor: null });
    }
    if (path.startsWith('/api/v1/workflows/')) {
      const workflow = world.workflows.find(({ id }) => path.endsWith(`/${id}`));
      return workflow === undefined ? respond({}, 404) : respond(workflow);
    }
    if (path === '/api/v1/executions') {
      return respond({ data: world.byWorkflow.get(url.searchParams.get('workflowId')) ?? [], nextCursor: null });
    }
    const execution = world.byId.get(path.split('/').at(-1));
    return execution === undefined ? respond({}, 404) : respond(detailOf(execution));
  };
}

async function timedScan(world, delayMs, concurrency) {
  const counter = { requests: 0 };
  const client = new N8nClient({
    baseUrl: 'https://n8n.example.com',
    apiKey: 'synthetic',
    fetch: fakeFetch(world, delayMs, counter),
  });
  const started = performance.now();
  const result = await scan(client, {
    executionLimit: 200,
    detailSampleSize: 5,
    now: NOW,
    ...(hasConcurrency ? { concurrency } : {}),
  });
  return { seconds: (performance.now() - started) / 1000, requests: counter.requests, result };
}

// A short warm-up with no delay, so the first measured run does not pay for compiling the code.
await timedScan(instance(40), 0, 1);

const world = instance(workflowCount);
const measured = [];
let reference;

for (const concurrency of hasConcurrency ? levels : [1]) {
  const { seconds, requests, result } = await timedScan(world, latencyMs, concurrency);
  const text = JSON.stringify(result);
  reference ??= text;
  measured.push({
    concurrency: hasConcurrency ? concurrency : null,
    seconds: Number(seconds.toFixed(2)),
    requests,
    findings: result.findings.length,
    sameResult: text === reference,
  });
}

const baseline = measured[0].seconds;
for (const row of measured) {
  row.speedup = Number((baseline / row.seconds).toFixed(2));
}

// The system clock rounds a timer up to its own step (about 15.6 ms on Windows), so the delay a
// request really had is read from the run that reads one workflow at a time.
const first = measured[0];
const effectiveLatencyMs =
  first.concurrency === null || first.concurrency === 1
    ? Number(((first.seconds * 1000) / first.requests).toFixed(1))
    : null;

if (asJson) {
  process.stdout.write(
    `${JSON.stringify({ workflows: workflowCount, latencyMs, effectiveLatencyMs, node: process.version, platform: process.platform, rows: measured }, null, 2)}\n`,
  );
} else {
  const lines = [
    `Invented instance: ${workflowCount} workflows, ${latencyMs} ms per request, Node ${process.version} on ${process.platform}.`,
  ];
  if (effectiveLatencyMs !== null) {
    lines.push(`Measured in the first run: each request took ${effectiveLatencyMs} ms on average.`);
  }
  if (!hasConcurrency) {
    lines.push('This build has no concurrency setting: it reads one workflow at a time.');
  }
  lines.push(
    '',
    'at once  seconds  requests  findings  speed-up  same result',
    ...measured.map((row) =>
      [
        String(row.concurrency ?? 'n/a').padStart(7),
        row.seconds.toFixed(2).padStart(8),
        String(row.requests).padStart(9),
        String(row.findings).padStart(9),
        `${row.speedup.toFixed(2)}x`.padStart(9),
        (row.sameResult ? 'yes' : 'NO').padStart(12),
      ].join(' '),
    ),
  );
  process.stdout.write(`${lines.join('\n')}\n`);
}

if (measured.some((row) => !row.sameResult)) {
  process.exitCode = 1;
}
