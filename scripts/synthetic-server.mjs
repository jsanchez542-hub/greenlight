// Serves the invented instance of examples/ over http on this machine, the way the n8n API does,
// so the program can be exercised end to end without an n8n. Only GET is answered, and only for a
// request that carries the key, which is how the tests show that a scan reads and nothing else.
//
//   node scripts/synthetic-server.mjs      # prints the address and the key to use

import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { executionDetail, instanceAt } from '../examples/synthetic-data.mjs';

/**
 * @param {{ key: string, now?: Date, port?: number }} options
 * @returns {Promise<{ url: string, requests: Array<{ method: string, path: string, authorised: boolean }>, close: () => Promise<void> }>}
 */
export async function startSyntheticServer({ key, now = new Date(), port = 0 }) {
  const { workflows, executions } = instanceAt(now);
  const byId = new Map(Object.values(executions).flat().map((execution) => [execution.id, execution]));
  const requests = [];

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const authorised = request.headers['x-n8n-api-key'] === key;
    requests.push({ method: request.method ?? '', path: url.pathname, authorised });

    const send = (status, body) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    };

    if (request.method !== 'GET') {
      send(405, { message: 'This instance can only be read.' });
      return;
    }
    if (!authorised) {
      send(401, { message: 'unauthorized' });
      return;
    }

    const path = url.pathname;
    if (path === '/api/v1/workflows') {
      send(200, { data: workflows.map(({ id, name, active }) => ({ id, name, active })), nextCursor: null });
    } else if (path.startsWith('/api/v1/workflows/')) {
      const workflow = workflows.find(({ id }) => path.endsWith(`/${id}`));
      send(workflow === undefined ? 404 : 200, workflow ?? {});
    } else if (path === '/api/v1/executions') {
      const list = executions[url.searchParams.get('workflowId')] ?? [];
      const newestFirst = [...list].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
      send(200, { data: newestFirst, nextCursor: null });
    } else if (path.startsWith('/api/v1/executions/')) {
      const execution = byId.get(path.split('/').at(-1));
      send(execution === undefined ? 404 : 200, execution === undefined ? {} : executionDetail(execution));
    } else {
      send(404, {});
    }
  });

  await new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', done);
  });
  const address = server.address();

  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise((done) => {
        server.close(() => done());
        server.closeAllConnections();
      }),
  };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const key = process.env['SYNTHETIC_KEY'] ?? 'synthetic-key';
  const { url } = await startSyntheticServer({ key, port: Number(process.env['PORT'] ?? 0) });
  process.stdout.write(`Invented n8n at ${url}, API key "${key}". Press Ctrl+C to stop it.\n`);
}
