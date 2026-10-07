#!/usr/bin/env node
// Starts the dashboard and opens it in the browser. It is a small script on purpose: the
// dashboard itself lives in web/ and this only prepares it, starts it and shows where it is.
import { spawn, spawnSync } from 'node:child_process';
import { browserOpeningDisabled, findFreePort, findLocalUrl, openCommand } from '../dist/panel/launcher.js';
import { messagesFor, resolveLang } from '../dist/i18n/index.js';
import { nodeVersionProblem } from '../dist/runtime.js';

// The language of this window is the one the person set, or the one of the computer. The .env file is
// not read here: the dashboard reads it itself, and this script only prepares and starts it.
const lang = resolveLang(process.env);
const t = messagesFor(lang).panel;

const problem = nodeVersionProblem(process.versions.node, lang);
if (problem !== null) {
  process.stderr.write(`${problem}\n`);
  process.exit(2);
}

const web = ['--prefix', 'web'];
const shell = process.platform === 'win32';

function step(message, args) {
  process.stdout.write(`\n${message}\n`);
  const result = spawnSync('npm', args, { stdio: 'inherit', shell });
  if (result.status !== 0) {
    process.stderr.write(`\n${t.failed}\n`);
    process.exit(result.status ?? 1);
  }
}

// The audit summary is left out here: it reports advisories in development tools that never run
// for the person using the dashboard, and would only alarm them. `npm audit` still works on its own.
step(t.preparing, [
  'install',
  ...web,
  '--no-audit',
  '--no-fund',
  '--loglevel=error',
]);
step(t.building, ['run', 'build', ...web]);

const port = process.env.PORT === undefined ? await findFreePort(3000, undefined, 50, lang) : Number(process.env.PORT);
if (port !== 3000 && process.env.PORT === undefined) {
  process.stdout.write(`\n${t.portBusy(port)}\n`);
}

const server = spawn('npm', ['start', ...web], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell,
  env: { ...process.env, PORT: String(port) },
});
let announced = false;

server.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  const url = announced ? null : findLocalUrl(text);
  if (url === null) {
    return;
  }
  announced = true;
  process.stdout.write(`\n${t.ready(url)}\n`);
  if (!browserOpeningDisabled(process.argv.slice(2), process.env)) {
    const { command, args } = openCommand(process.platform, url);
    spawn(command, args, { stdio: 'ignore', detached: true, shell }).on('error', () => undefined).unref();
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill());
}
server.on('exit', (code) => process.exit(code ?? 0));
