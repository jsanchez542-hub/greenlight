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

function setStep(id, name, position) {
  return {
    id,
    name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position,
    parameters: {
      assignments: { assignments: [{ id: `${id}-assignment`, name: 'done', value: true, type: 'boolean' }] },
      options: {},
    },
  };
}

// A request to a port where nothing listens, so it fails every time and straight away.
function failingStep(id, name, onError) {
  return {
    id,
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [260, 0],
    onError,
    parameters: { method: 'GET', url: 'http://127.0.0.1:9/unreachable', options: { timeout: 3000 } },
  };
}

function connect(from, outputs) {
  return { [from.name]: { main: outputs.map((targets) => targets.map((node) => ({ node: node.name, type: 'main', index: 0 }))) } };
}

const silentTrigger = webhook('greenlight-e2e-silent');
const outputTrigger = webhook('greenlight-e2e-error-output');
const routedTrigger = webhook('greenlight-e2e-routed');
const healthyTrigger = webhook('greenlight-e2e-healthy');
const idleTrigger = webhook('greenlight-e2e-idle');

// "Continue (regular output)": the error travels on as an ordinary item of the only output.
const sendReceipt = failingStep('send-receipt', 'Send receipt', 'continueRegularOutput');
// "Continue (using error output)": the error leaves by a second output of its own. Here that
// output is connected to nothing, so the error goes nowhere.
const chargeCard = failingStep('charge-card', 'Charge card', 'continueErrorOutput');
// The same, with the error output connected to a step that handles it.
const refundCard = failingStep('refund-card', 'Refund card', 'continueErrorOutput');
const handleError = setStep('handle-error', 'Handle error', [520, 120]);

const healthyStep = setStep('healthy-step', 'Mark as done', [260, 0]);
const idleStep = setStep('idle-step', 'Mark as done', [260, 0]);

const settings = { executionOrder: 'v1' };

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
      nodes: [silentTrigger, sendReceipt],
      connections: connect(silentTrigger, [[sendReceipt]]),
      settings,
    },
    expect: { health: 'critical', trigger: 'event', finding: { detector: 'silent-error', severity: 'critical', node: 'Send receipt' } },
  },
  {
    key: 'errorOutput',
    calls: 6,
    workflow: {
      name: 'E2E error output, not connected',
      nodes: [outputTrigger, chargeCard],
      connections: connect(outputTrigger, [[chargeCard]]),
      settings,
    },
    expect: { health: 'critical', trigger: 'event', finding: { detector: 'silent-error', severity: 'critical', node: 'Charge card' } },
  },
  {
    key: 'routed',
    calls: 6,
    workflow: {
      name: 'E2E error output, connected',
      nodes: [routedTrigger, refundCard, handleError],
      connections: { ...connect(routedTrigger, [[refundCard]]), ...connect(refundCard, [[], [handleError]]) },
      settings,
    },
    expect: { health: 'critical', trigger: 'event', finding: { detector: 'silent-error', severity: 'critical', node: 'Refund card' } },
  },
  {
    key: 'healthy',
    calls: 6,
    workflow: {
      name: 'E2E healthy',
      nodes: [healthyTrigger, healthyStep],
      connections: connect(healthyTrigger, [[healthyStep]]),
      settings,
    },
    expect: { health: 'healthy', trigger: 'event', finding: null },
  },
  {
    key: 'idle',
    calls: 0,
    workflow: {
      name: 'E2E never run',
      nodes: [idleTrigger, idleStep],
      connections: connect(idleTrigger, [[idleStep]]),
      settings,
    },
    expect: { health: 'no-runs', trigger: 'event', finding: null },
  },
];
