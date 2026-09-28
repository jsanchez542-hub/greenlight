#!/usr/bin/env node
import { loadConfig } from './config.js';
import { N8nClient } from './n8n/client.js';
import { renderReport } from './report.js';
import { scan } from './scan.js';

const usage = `GreenLight  checks an n8n instance for workflows that fail without saying so.

  greenlight [--json]

Environment:
  N8N_BASE_URL                URL of the n8n instance
  N8N_API_KEY                 API key with read access
  GREENLIGHT_EXECUTION_LIMIT  executions read per workflow (default 200)
  GREENLIGHT_DETAIL_SAMPLE    executions inspected node by node (default 5)

Exits with 1 when something is found, so it can gate a pipeline.
`;

async function main(argv: string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(usage);
    return 0;
  }

  const config = loadConfig(process.env);
  const client = new N8nClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
  const result = await scan(client, {
    executionLimit: config.executionLimit,
    detailSampleSize: config.detailSampleSize,
  });

  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(renderReport(result, process.stdout.isTTY === true));
  }

  return result.findings.length === 0 ? 0 : 1;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  });
