#!/usr/bin/env node
import { loadConfig, loadWatchConfig } from './config.js';
import { messagesFor, parseLang, resolveLang, type Lang } from './i18n/index.js';
import { N8nClient } from './n8n/client.js';
import { renderReport } from './report.js';
import { nodeVersionProblem } from './runtime.js';
import { VERSION } from './version.js';
import { diagnose } from './setup/diagnose.js';
import { runInit, renderDiagnosis } from './setup/init.js';
import { SetupCancelled, createTerminalPrompter } from './setup/prompter.js';
import { scan } from './scan.js';
import { checkForUpdate, FileUpdateCache, updateChecksEnabled, type UpdateInfo } from './update/check.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { deliverAlert } from './watch/notify.js';
import { FileStateStore } from './watch/state.js';
import { defaultWatchOptions, runCycle, watch, type WatchDependencies } from './watch/watch.js';

function loadEnvFile(lang: Lang, path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      const t = messagesFor(lang).cli;
      throw new Error(t.envFileUnreadable(path, error instanceof Error ? error.message : t.unknownError));
    }
  }
}

function stamp(line: string): string {
  return `[${new Date().toISOString()}] ${line}\n`;
}

/** Takes `--lang es` or `--lang=es` out of the arguments, so no command has to know about it. */
function takeLangFlag(argv: string[]): { argv: string[]; lang: Lang | null } {
  const rest: string[] = [];
  let lang: Lang | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string;
    if (argument === '--lang') {
      lang = parseLang(argv[index + 1]);
      index += 1;
    } else if (argument.startsWith('--lang=')) {
      lang = parseLang(argument.slice('--lang='.length));
    } else {
      rest.push(argument);
    }
  }
  return { argv: rest, lang };
}

const updateCache = new FileUpdateCache('.greenlight-update.json');

/** Only ever called when the person turned update notices on. It never throws. */
async function newerVersion(): Promise<UpdateInfo | null> {
  if (!updateChecksEnabled(process.env)) {
    return null;
  }
  try {
    return await checkForUpdate({ current: VERSION, cache: updateCache });
  } catch {
    return null;
  }
}

async function updateNoticeLine(lang: Lang): Promise<string | null> {
  const update = await newerVersion();
  return update === null ? null : messagesFor(lang).cli.updateAvailable(update.current, update.latest, update.url);
}

async function runInitCommand(lang: Lang): Promise<number> {
  const prompter = createTerminalPrompter(process.stdin, process.stdout, lang);
  try {
    return await runInit({
      prompter,
      diagnose,
      lang,
      envPath: '.env',
      readFile: (path) => {
        try {
          return readFileSync(path, 'utf8');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
          }
          throw error;
        }
      },
      writeFile: (path, text) => writeFileSync(path, text, { encoding: 'utf8', mode: 0o600 }),
    });
  } catch (error) {
    if (error instanceof SetupCancelled) {
      process.stderr.write(`\n${error.message}\n`);
      return 1;
    }
    throw error;
  } finally {
    prompter.close();
  }
}

async function runDoctor(lang: Lang): Promise<number> {
  const t = messagesFor(lang).cli;
  const result = await diagnose({
    baseUrl: process.env['N8N_BASE_URL'],
    apiKey: process.env['N8N_API_KEY'],
    allowInsecureHttp: ['1', 'true'].includes((process.env['GREENLIGHT_ALLOW_INSECURE_HTTP'] ?? '').toLowerCase()),
    lang,
  });
  process.stdout.write(`${t.doctorHeading(VERSION, result.host)}\n\n`);
  process.stdout.write(`${renderDiagnosis(result, lang).join('\n')}\n\n`);

  const notice = await updateNoticeLine(lang);
  if (notice !== null) {
    process.stdout.write(`${notice}\n\n`);
  }

  if (result.ok) {
    process.stdout.write(`${t.doctorOk}\n`);
    return 0;
  }
  process.stdout.write(`${t.doctorFix}\n`);
  return 1;
}

async function runScan(argv: string[], lang: Lang): Promise<number> {
  const config = loadConfig(process.env, lang);
  const client = new N8nClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    allowInsecureHttp: config.allowInsecureHttp,
    lang,
  });
  const result = await scan(client, {
    executionLimit: config.executionLimit,
    detailSampleSize: config.detailSampleSize,
  });

  const asJson = argv.includes('--json');
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(renderReport(result, process.stdout.isTTY === true, lang));
  }

  // The notice goes to stderr and never into --json, so a program reading the output is not disturbed.
  if (!asJson) {
    const notice = await updateNoticeLine(lang);
    if (notice !== null) {
      process.stderr.write(`\n${notice}\n`);
    }
  }

  return result.findings.length === 0 ? 0 : 1;
}

async function runWatch(argv: string[], lang: Lang): Promise<number> {
  const t = messagesFor(lang);
  const config = loadConfig(process.env, lang);
  const watchConfig = loadWatchConfig(process.env, lang);
  const client = new N8nClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    allowInsecureHttp: config.allowInsecureHttp,
    lang,
  });
  const warn = (line: string): void => void process.stderr.write(stamp(line));

  const { webhookUrl, webhookToken } = watchConfig;
  const deps: WatchDependencies = {
    scan: () =>
      scan(client, {
        executionLimit: config.executionLimit,
        detailSampleSize: config.detailSampleSize,
      }),
    store: new FileStateStore(watchConfig.stateFile, warn, lang),
    deliver:
      webhookUrl === null
        ? null
        : (payload) => deliverAlert(payload, { url: webhookUrl, token: webhookToken, lang }),
    instance: new URL(config.baseUrl).host,
    options: { ...defaultWatchOptions, notifyMinimum: watchConfig.notifyMinimum },
    log: (line) => void process.stdout.write(stamp(line)),
    warn,
    lang,
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
  deps.log(t.cli.watching(deps.instance, watchConfig.intervalMinutes, webhookUrl !== null));

  // A watcher can run for weeks, so the notice is looked for again each day, and told once per version.
  let announced: string | null = null;
  const announceUpdate = async (): Promise<void> => {
    const update = await newerVersion();
    if (update !== null && update.latest !== announced) {
      announced = update.latest;
      deps.log(t.cli.updateAvailable(update.current, update.latest, update.url));
    }
  };
  deps.beforeCycle = announceUpdate;

  await watch(deps, watchConfig.intervalMinutes * 60_000, controller.signal);
  return 0;
}

async function main(rawArgv: string[]): Promise<number> {
  const { argv, lang: flagLang } = takeLangFlag(rawArgv);

  // Before the .env file is read, only the environment can say which language to speak.
  const early = flagLang ?? resolveLang(process.env);
  const problem = nodeVersionProblem(process.versions.node, early);
  if (problem !== null) {
    process.stderr.write(`${problem}\n`);
    return 2;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  if (argv.includes('--help') || argv.includes('-h')) {
    try {
      loadEnvFile(early);
    } catch {
      // Help must work even when the settings file is broken.
    }
    process.stdout.write(messagesFor(flagLang ?? resolveLang(process.env)).cli.usage);
    return 0;
  }

  loadEnvFile(early);
  const lang = flagLang ?? resolveLang(process.env);

  if (argv[0] === 'init') {
    return runInitCommand(lang);
  }
  if (argv[0] === 'doctor') {
    return runDoctor(lang);
  }
  return argv[0] === 'watch' ? runWatch(argv.slice(1), lang) : runScan(argv, lang);
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const lang = resolveLang(process.env);
    process.stderr.write(`${error instanceof Error ? error.message : messagesFor(lang).cli.unknownError}\n`);
    process.exitCode = 2;
  });
