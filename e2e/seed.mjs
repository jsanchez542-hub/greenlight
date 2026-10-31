// Puts the workflows of fixtures.mjs on a fresh n8n and runs them, so the instance looks the way a
// scan finds a small real one. The owner and the keys are made the way the editor makes them, and
// everything else goes through the public API, which is the one GreenLight reads.
//
// Nothing here prints a key. The throwaway instance has no data worth protecting, but the habit is
// the one that matters.

import { randomBytes } from 'node:crypto';
import { fixtures } from './fixtures.mjs';

export class SeedError extends Error {}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function parse(response, what) {
  const text = await response.text();
  if (!response.ok) {
    throw new SeedError(`${what}: n8n answered ${response.status} ${text.slice(0, 300)}`);
  }
  try {
    return text === '' ? null : JSON.parse(text);
  } catch {
    throw new SeedError(`${what}: n8n did not answer with JSON.`);
  }
}

async function until(check, what, { timeoutMs = 60_000, everyMs = 500 } = {}) {
  const started = Date.now();
  for (;;) {
    const value = await check();
    if (value) {
      return value;
    }
    if (Date.now() - started > timeoutMs) {
      throw new SeedError(`Timed out waiting for ${what}.`);
    }
    await sleep(everyMs);
  }
}

export async function waitUntilReady(baseUrl) {
  await until(
    async () => {
      try {
        const readiness = await fetch(`${baseUrl}/healthz/readiness`);
        // A version without the readiness check still answers the plain one.
        return readiness.status === 404 ? (await fetch(`${baseUrl}/healthz`)).ok : readiness.ok;
      } catch {
        return false;
      }
    },
    'n8n to be ready',
    { timeoutMs: 180_000, everyMs: 1000 },
  );
}

function cookieOf(response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

/** The first user of a fresh n8n. The password only has to satisfy its rules and live for this run. */
export async function createOwner(baseUrl) {
  const password = `${randomBytes(12).toString('base64url')}-aA1`;
  const response = await fetch(`${baseUrl}/rest/owner/setup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com', firstName: 'Test', lastName: 'Owner', password }),
  });
  await parse(response, 'creating the owner');
  const cookie = cookieOf(response);
  if (cookie === '') {
    throw new SeedError('creating the owner: n8n did not start a session.');
  }
  return { cookie };
}

/** The version of n8n, which only a signed-in user is told. */
export async function readVersion(baseUrl, owner) {
  const response = await fetch(`${baseUrl}/rest/settings`, { headers: { cookie: owner.cookie } });
  const settings = await parse(response, 'reading the settings');
  return settings?.data?.versionCli ?? settings?.versionCli ?? null;
}

/**
 * @param {string} baseUrl
 * @param {{ cookie: string }} owner
 * @param {{ label: string, only?: (scope: string) => boolean }} options `only` keeps the scopes it accepts
 */
export async function createApiKey(baseUrl, owner, { label, only = () => true }) {
  const headers = { 'content-type': 'application/json', cookie: owner.cookie };
  const available = await parse(await fetch(`${baseUrl}/rest/api-keys/scopes`, { headers }), 'listing the scopes of a key');
  const scopes = (available?.data ?? []).filter(only);
  if (scopes.length === 0) {
    throw new SeedError(`No scope of a key matches what ${label} needs.`);
  }
  const created = await parse(
    await fetch(`${baseUrl}/rest/api-keys`, { method: 'POST', headers, body: JSON.stringify({ label, scopes, expiresAt: null }) }),
    `creating the key ${label}`,
  );
  const key = created?.data?.rawApiKey ?? created?.data?.apiKey;
  if (typeof key !== 'string' || key === '') {
    throw new SeedError(`creating the key ${label}: n8n did not return it.`);
  }
  return { key, scopes };
}

function api(baseUrl, key) {
  return async (path, { method = 'GET', body } = {}) => {
    const response = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: { 'X-N8N-API-KEY': key, 'content-type': 'application/json', accept: 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return parse(response, `${method} ${path.split('?')[0]}`);
  };
}

async function callWebhook(baseUrl, path) {
  // A webhook can take a moment to be registered after its workflow is switched on.
  await until(
    async () => (await fetch(`${baseUrl}/webhook/${path}`, { method: 'POST' })).ok,
    `the webhook ${path} to answer`,
    { timeoutMs: 30_000, everyMs: 500 },
  );
}

/**
 * Creates every fixture, switches it on, calls it as many times as it asks for and waits until
 * n8n has recorded all those runs.
 * @returns {Promise<Array<{ key: string, id: string, name: string, calls: number, expect: object }>>}
 */
export async function seedWorkflows(baseUrl, adminKey) {
  const call = api(baseUrl, adminKey);
  const seeded = [];

  for (const fixture of fixtures) {
    const created = await call('/workflows', { method: 'POST', body: fixture.workflow });
    await call(`/workflows/${created.id}/activate`, { method: 'POST' });
    seeded.push({ key: fixture.key, id: created.id, name: fixture.workflow.name, calls: fixture.calls, expect: fixture.expect });
  }

  for (const workflow of seeded) {
    const path = fixtures.find((fixture) => fixture.key === workflow.key).workflow.nodes[0].parameters.path;
    for (let index = 0; index < workflow.calls; index += 1) {
      await callWebhook(baseUrl, path);
    }
  }

  for (const workflow of seeded) {
    await until(
      async () => {
        const { data } = await call(`/executions?workflowId=${workflow.id}&limit=250`);
        return data.length >= workflow.calls && data.every((execution) => execution.finished === true || execution.status === 'success' || execution.status === 'error');
      },
      `the ${workflow.calls} runs of ${workflow.name} to be recorded`,
      { timeoutMs: 60_000, everyMs: 500 },
    );
  }

  return seeded;
}
