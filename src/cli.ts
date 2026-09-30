#!/usr/bin/env node
import { loadConfig, loadWatchConfig } from './config.js';
import { N8nClient } from './n8n/client.js';
import { renderReport } from './report.js';
import { scan } from './scan.js';
import { deliverAlert } from './watch/notify.js';
import { FileStateStore } from './watch/state.js';
import { defaultWatchOptions, runCycle, watch, type WatchDependencies } from './watch/watch.js';

const usage = `GreenLight  checks an n8n instance for workflows that fail without saying so.

  greenlight [--json]                 scan once and print the report
  greenlight watch [--once]           scan on a schedule and alert when something new appears

Environment:
  N8N_BASE_URL                URL of the n8n instance
  N8N_API_KEY                 API key with read access
  GREENLIGHT_EXECUTION_LIMIT  executions read per workflow (default 200)
  GREENLIGHT_DETAIL_SAMPLE    executions inspected node by node (default 5)

Only for watch:
  GREENLIGHT_WEBHOOK_URL      where alerts are posted as JSON (optional; without it changes are only printed)
  GREENLIGHT_WEBHOOK_TOKEN    sent as "Authorization: Bearer <token>" (optional)
  GREENLIGHT_INTERVAL_MINUTES minutes between scans (default 5)
  GREENLIGHT_NOTIFY_MIN       "warning" (default) or "critical"
  GREENLIGHT_STATE_FILE       remembers what was already reported (default .greenlight-state.json)

Exit codes: 0 nothing found, 1 findings, 2 the scan could not run.
With watch --once it is the same, so it can run from cron or a scheduler.
`;

function stamp(line: string): string {
  return `[${new Date().toISOString()}] ${line}\n`;
}

async function runScan(argv: string[]): Promise<number> {
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

async function runWatch(argv: string[]): Promise<number> {
  const config = loadConfig(process.env);
  const watchConfig = loadWatchConfig(process.env);
  const client = new N8nClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
  const warn = (line: string): void => void process.stderr.write(stamp(line));

  const { webhookUrl, webhookToken } = watchConfig;
  const deps: WatchDependencies = {
    scan: () =>
      scan(client, {
        executionLimit: config.executionLimit,
        detailSampleSize: config.detailSampleSize,
      }),
    store: new FileStateStore(watchConfig.stateFile, warn),
    deliver:
      webhookUrl === null
        ? null
        : (payload) => deliverAlert(payload, { url: webhookUrl, token: webhookToken }),
    instance: new URL(config.baseUrl).host,
    options: { ...defaultWatchOptions, notifyMinimum: watchConfig.notifyMinimum },
    log: (line) => void process.stdout.write(stamp(line)),
    warn,
  };

  if (argv.includes('--once')) {
    const outcome = await runCycle(deps);
    if (outcome.status === 'scan-failed') {
      return 2;
    }
    return outcome.openFindings === 0 ? 0 : 1;
  }

  const controller = new AbortController();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => controller.abort());
  }
  deps.log(
    `Watching ${deps.instance} every ${watchConfig.intervalMinutes} min. ${
      webhookUrl === null ? 'No webhook set, changes are only printed.' : 'Alerts go to the webhook.'
    }`,
  );
  await watch(deps, watchConfig.intervalMinutes * 60_000, controller.signal);
  return 0;
}

async function main(argv: string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(usage);
    return 0;
  }

  return argv[0] === 'watch' ? runWatch(argv.slice(1)) : runScan(argv);
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  });
