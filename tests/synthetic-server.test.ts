import { afterEach, describe, expect, it } from 'vitest';
import { startSyntheticServer, type SyntheticServer } from '../scripts/synthetic-server.mjs';

const KEY = 'a-made-up-key';
let server: SyntheticServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function start(): Promise<SyntheticServer> {
  server = await startSyntheticServer({ key: KEY, now: new Date('2026-03-02T09:00:00.000Z') });
  return server;
}

const asReader = { headers: { 'X-N8N-API-KEY': KEY } };

describe('the invented instance served over http', () => {
  it('answers the endpoints a scan uses, for a request that carries the key', async () => {
    const { url } = await start();

    const workflows = (await (await fetch(`${url}/api/v1/workflows`, asReader)).json()) as { data: unknown[] };
    expect(workflows.data).toHaveLength(18);

    const executions = (await (await fetch(`${url}/api/v1/executions?workflowId=orders`, asReader)).json()) as {
      data: Array<{ id: string; startedAt: string }>;
    };
    expect(executions.data.length).toBeGreaterThan(30);
    expect(Date.parse(executions.data[0]?.startedAt ?? '')).toBeGreaterThan(Date.parse(executions.data[1]?.startedAt ?? ''));

    const detail = await fetch(`${url}/api/v1/executions/${executions.data[0]?.id}`, asReader);
    expect(detail.status).toBe(200);
    expect((await fetch(`${url}/api/v1/workflows/orders`, asReader)).status).toBe(200);
    expect((await fetch(`${url}/api/v1/workflows/nope`, asReader)).status).toBe(404);
  });

  it('refuses a request without the key', async () => {
    const { url } = await start();

    expect((await fetch(`${url}/api/v1/workflows`)).status).toBe(401);
    expect((await fetch(`${url}/api/v1/workflows`, { headers: { 'X-N8N-API-KEY': 'wrong' } })).status).toBe(401);
  });

  it('only reads: anything that is not a GET is refused, and every request is recorded', async () => {
    const { url, requests } = await start();

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect((await fetch(`${url}/api/v1/workflows`, { method, ...asReader })).status).toBe(405);
    }
    await fetch(`${url}/api/v1/workflows`, asReader);

    expect(requests.map((request) => request.method)).toEqual(['POST', 'PUT', 'PATCH', 'DELETE', 'GET']);
    expect(requests.at(-1)?.authorised).toBe(true);
  });

  it('listens on this machine only', async () => {
    expect((await start()).url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });
});
