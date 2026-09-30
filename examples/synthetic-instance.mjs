// Runs GreenLight against an invented n8n instance so every check can be seen at once.
// The instance lives in memory; nothing is sent over the network.
//
//   npm run build
//   node examples/synthetic-instance.mjs          # text report
//   node examples/synthetic-instance.mjs --json   # the file in examples/scan-result.json

import { N8nClient, renderReport, scan } from '../dist/index.js';

const NOW = new Date('2026-03-02T09:00:00.000Z');
const HOUR = 60 * 60 * 1000;

const clock = [{ name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger' }];
const webhook = [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }];

// A fixed jitter keeps the output identical between runs.
function jitter(index, spread) {
  return 1 + (((index * 7919) % 21) - 10) / 100 * spread;
}

function run(workflowId, index, startedAt, durationMs) {
  return {
    id: `${workflowId}-${index}`,
    workflowId,
    status: 'success',
    startedAt: new Date(startedAt).toISOString(),
    stoppedAt: new Date(startedAt + durationMs).toISOString(),
  };
}

function everyHour(workflowId, count, typicalMs, offsetHours = 0) {
  return Array.from({ length: count }, (_, index) =>
    run(workflowId, index, NOW.getTime() - (index + offsetHours) * HOUR, typicalMs * jitter(index, 1)),
  );
}

function onDemand(workflowId, count, typicalMs, spanHours) {
  return Array.from({ length: count }, (_, index) => {
    const hoursAgo = ((index * 104729) % (spanHours * 100)) / 100;
    return run(workflowId, index, NOW.getTime() - hoursAgo * HOUR, typicalMs * jitter(index, 2));
  });
}

// Inventory sync: 142 runs of about 1.2 s, then a day of runs at about 10.5 s.
function inventorySync() {
  const baseline = [
    ...Array.from({ length: 70 }, (_, index) => 1000 + Math.round((index * 219) / 69)),
    1220,
    ...Array.from({ length: 63 }, (_, index) => 1225 + Math.round((index * 270) / 62)),
    ...Array.from({ length: 8 }, (_, index) => 1500 + index * 12),
  ];
  const recent = [
    ...Array.from({ length: 11 }, (_, index) => 10050 + index * 40),
    10500,
    ...Array.from({ length: 12 }, (_, index) => 10560 + index * 30),
  ];

  return [
    ...recent.map((ms, index) => run('inventory', index, NOW.getTime() - index * HOUR, ms)),
    ...baseline.map((_, index) => {
      const ms = baseline[(index * 37) % baseline.length];
      return run('inventory', 24 + index, NOW.getTime() - (25 + index) * HOUR, ms);
    }),
  ];
}

// Price monitor: hourly for a week, then its schedule was widened to once a day.
function priceMonitor() {
  return [
    run('prices', 0, NOW.getTime() - 2 * HOUR, 640),
    ...everyHour('prices', 168, 640, 25).map((execution, index) => ({
      ...execution,
      id: `prices-${index + 1}`,
    })),
  ];
}

const workflows = [
  { id: 'orders', name: 'Order confirmations', active: true, nodes: webhook },
  { id: 'inventory', name: 'Inventory sync', active: true, nodes: clock },
  { id: 'prices', name: 'Price monitor', active: true, nodes: clock },
  { id: 'leads', name: 'Lead enrichment', active: true, nodes: webhook },
  { id: 'invoices', name: 'Invoice export', active: true, nodes: clock },
  { id: 'standup', name: 'Standup reminder', active: true, nodes: clock },
  { id: 'crm', name: 'CRM contact sync', active: true, nodes: clock },
  { id: 'tickets', name: 'Support ticket triage', active: true, nodes: webhook },
  { id: 'backup', name: 'Database backup', active: true, nodes: clock },
  { id: 'signup', name: 'Newsletter signup', active: true, nodes: webhook },
  { id: 'payments', name: 'Payment events', active: true, nodes: webhook },
  { id: 'bookings', name: 'Booking confirmations', active: true, nodes: webhook },
  { id: 'warehouse', name: 'Warehouse load', active: true, nodes: clock },
  { id: 'onboarding', name: 'Onboarding sequence', active: true, nodes: webhook },
  { id: 'social', name: 'Social post scheduler', active: false, nodes: clock },
  { id: 'survey', name: 'Survey responses', active: true, nodes: webhook },
  { id: 'legacy', name: 'Legacy import', active: false, nodes: webhook },
  { id: 'audit', name: 'Access audit', active: false, nodes: clock },
];

const executions = {
  orders: onDemand('orders', 60, 2100, 72),
  inventory: inventorySync(),
  prices: priceMonitor(),
  leads: onDemand('leads', 40, 3400, 96),
  invoices: everyHour('invoices', 120, 5200),
  standup: everyHour('standup', 90, 450),
  crm: everyHour('crm', 150, 7800),
  tickets: onDemand('tickets', 80, 2600, 48),
  backup: everyHour('backup', 100, 41000),
  signup: onDemand('signup', 25, 900, 120),
  payments: onDemand('payments', 110, 1300, 72),
  bookings: onDemand('bookings', 35, 1800, 96),
  warehouse: everyHour('warehouse', 140, 26000, 9),
  onboarding: [],
  social: [],
  survey: [],
  legacy: [],
  audit: [],
};

function executionDetail(execution) {
  const failing = execution.workflowId === 'orders';
  const output = failing
    ? { error: 'Request failed with status code 401', description: 'API key revoked' }
    : { id: `${execution.id}-out` };
  return {
    ...execution,
    data: {
      resultData: {
        runData: {
          Trigger: [{ data: { main: [[{ json: { receivedAt: execution.startedAt } }]] } }],
          [failing ? 'Send receipt' : 'Process']: [{ data: { main: [[{ json: output }]] } }],
        },
      },
    },
  };
}

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

process.stdout.write(
  process.argv.includes('--json') ? `${JSON.stringify(result, null, 2)}\n` : renderReport(result, false),
);
