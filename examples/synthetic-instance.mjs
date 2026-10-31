// Runs GreenLight against an invented n8n instance so every check can be seen at once.
// The instance lives in memory; nothing is sent over the network.
//
//   npm run build
//   node examples/synthetic-instance.mjs          # text report
//   node examples/synthetic-instance.mjs --json   # the file in examples/scan-result.json
//   node examples/synthetic-instance.mjs --lang es   # the same report in Spanish

import { N8nClient, renderReport, scan } from '../dist/index.js';
import { executionDetail, instanceAt } from './synthetic-data.mjs';

const NOW = new Date('2026-03-02T09:00:00.000Z');
const { workflows, executions } = instanceAt(NOW);

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function syntheticInstance(input) {
  const url = new URL(String(input));
  const path = url.pathname;

  if (path === '/api/v1/workflows') {
    return respond({ data: workflows.map(({ id, name, active }) => ({ id, name, active })) });
  }
  if (path.startsWith('/api/v1/workflows/')) {
    const workflow = workflows.find(({ id }) => path.endsWith(`/${id}`));
    return workflow === undefined ? respond({}, 404) : respond(workflow);
  }
  if (path === '/api/v1/executions') {
    const list = executions[url.searchParams.get('workflowId')] ?? [];
    const newestFirst = [...list].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
    return respond({ data: newestFirst, nextCursor: null });
  }

  const id = path.split('/').at(-1);
  const execution = Object.values(executions)
    .flat()
    .find((candidate) => candidate.id === id);
  return execution === undefined ? respond({}, 404) : respond(executionDetail(execution));
}

const client = new N8nClient({
  baseUrl: 'https://n8n.example.com',
  apiKey: 'synthetic',
  fetch: syntheticInstance,
});
const result = await scan(client, { executionLimit: 200, detailSampleSize: 5, now: NOW });

// `--lang es` prints the same report in Spanish.
const lang = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'en';

process.stdout.write(
  process.argv.includes('--json') ? `${JSON.stringify(result, null, 2)}\n` : renderReport(result, false, lang === 'es' ? 'es' : 'en'),
);
