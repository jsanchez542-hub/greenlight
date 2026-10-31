// The workflows that are put on a real n8n to see what a scan finds. Each one is as small as it
// can be and does one thing, and says what GreenLight is expected to make of it once it has run.
//
// They only ever live on the throwaway instance of the test: nothing here is, or comes from, a
// real workflow.

const WEBHOOK_VERSION = 2;

function webhook(path) {
  return {
    id: `webhook-${path}`,
    name: 'Webhook',
    type: 'n8n-nodes-base.webhook',
    typeVersion: WEBHOOK_VERSION,
    position: [0, 0],
    parameters: { httpMethod: 'POST', path, responseMode: 'onReceived', options: {} },
  };
}

function markAsDone(id) {
  return {
    id,
    name: 'Mark as done',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [260, 0],
    parameters: {
      assignments: { assignments: [{ id: `${id}-assignment`, name: 'done', value: true, type: 'boolean' }] },
      options: {},
    },
  };
}

function chain(trigger, step) {
  return { [trigger.name]: { main: [[{ node: step.name, type: 'main', index: 0 }]] } };
}

// The step fails every time, and is set to carry on: the run is reported as a success and the
// error travels on as data. This is the failure the whole program exists to find.
const failingStep = {
  id: 'send-receipt',
  name: 'Send receipt',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [260, 0],
  onError: 'continueRegularOutput',
  parameters: { method: 'GET', url: 'http://127.0.0.1:9/receipt', options: { timeout: 3000 } },
};

const silentTrigger = webhook('greenlight-e2e-silent');
const healthyTrigger = webhook('greenlight-e2e-healthy');
const idleTrigger = webhook('greenlight-e2e-idle');
const healthyStep = markAsDone('healthy-step');
const idleStep = markAsDone('idle-step');

/**
 * `calls` is how many times the webhook is called after the workflow is switched on.
 * `expect` is what a scan has to report for it.
 */
export const fixtures = [
  {
    key: 'silent',
    calls: 6,
    workflow: {
      name: 'E2E silent failure',
      nodes: [silentTrigger, failingStep],
      connections: chain(silentTrigger, failingStep),
      settings: { executionOrder: 'v1' },
    },
    expect: { health: 'critical', trigger: 'event', finding: { detector: 'silent-error', severity: 'critical', node: 'Send receipt' } },
  },
  {
    key: 'healthy',
    calls: 6,
    workflow: {
      name: 'E2E healthy',
      nodes: [healthyTrigger, healthyStep],
      connections: chain(healthyTrigger, healthyStep),
      settings: { executionOrder: 'v1' },
    },
    expect: { health: 'healthy', trigger: 'event', finding: null },
  },
  {
    key: 'idle',
    calls: 0,
    workflow: {
      name: 'E2E never run',
      nodes: [idleTrigger, idleStep],
      connections: chain(idleTrigger, idleStep),
      settings: { executionOrder: 'v1' },
    },
    expect: { health: 'no-runs', trigger: 'event', finding: null },
  },
];
