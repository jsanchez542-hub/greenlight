// Starts npm, npx and other programs the same way on every system. Windows can only start npm and
// npx through a shell, and Node warns about handing a shell a list of arguments, so on Windows the
// command is built as one line with each argument quoted. Everywhere else no shell is involved.

import { spawn, spawnSync } from 'node:child_process';

const PLAIN = /^[\w@%+=:,./\\-]+$/;

/** Quotes one argument for cmd.exe. */
export function quoteForWindows(argument) {
  if (argument !== '' && PLAIN.test(argument)) {
    return argument;
  }
  return `"${argument.replaceAll('"', '\\"')}"`;
}

function prepare(command, args, options) {
  if (process.platform !== 'win32') {
    return [command, args, options];
  }
  return [[command, ...args].map(quoteForWindows).join(' '), [], { ...options, shell: true }];
}

export function spawnCommand(command, args, options = {}) {
  const [line, rest, settings] = prepare(command, args, options);
  return spawn(line, rest, settings);
}

export function spawnCommandSync(command, args, options = {}) {
  const [line, rest, settings] = prepare(command, args, options);
  return spawnSync(line, rest, settings);
}
