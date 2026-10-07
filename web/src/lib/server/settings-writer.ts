import { closeSync, fsyncSync, lstatSync, openSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { removeEnvKeys, upsertEnv } from 'greenlight';
import { EnvFileError, MAX_ENV_FILE_BYTES, readEnvText } from './environment';

export const WRITABLE_SETTINGS = ['N8N_BASE_URL', 'N8N_API_KEY'] as const;
export type WritableSetting = (typeof WRITABLE_SETTINGS)[number];

let queue: Promise<unknown> = Promise.resolve();

function failure(code: string): EnvFileError {
  return new EnvFileError(`The settings file cannot be written (${code}).`);
}

function codeOf(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === 'string' ? code : 'unknown error';
}

function refuseLinks(filePath: string): void {
  try {
    if (lstatSync(filePath).isSymbolicLink()) {
      throw new EnvFileError('The .env file is a symbolic link, which GreenLight does not follow. Use a regular file.');
    }
  } catch (error) {
    if (error instanceof EnvFileError) {
      throw error;
    }
    if (codeOf(error) !== 'ENOENT') {
      throw failure(codeOf(error));
    }
  }
}

/**
 * Replaces the file in one step: the new text goes to a private temporary file beside it,
 * which is then renamed over the original. A reader sees the old file or the new one, never half
 * of either, and a crash leaves the old file alone.
 */
function replaceFile(filePath: string, text: string): void {
  if (Buffer.byteLength(text) > MAX_ENV_FILE_BYTES) {
    throw new EnvFileError(`The .env file would be larger than ${MAX_ENV_FILE_BYTES / 1024} KiB.`);
  }
  refuseLinks(filePath);
  const temporary = path.join(path.dirname(filePath), `.env.${randomBytes(6).toString('hex')}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporary, 'wx', 0o600);
    writeSync(descriptor, text);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, filePath);
  } catch (error) {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    try {
      unlinkSync(temporary);
    } catch {
      // nothing was created, or it is already gone
    }
    throw error instanceof EnvFileError ? error : failure(codeOf(error));
  }
}

function serialised<T>(task: () => T): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Sets the address and the key and leaves every other line of the file as it was. */
export function saveSettings(filePath: string, values: Record<WritableSetting, string>): Promise<void> {
  return serialised(() => {
    const existing = readEnvText(filePath) ?? '';
    replaceFile(filePath, upsertEnv(existing, { N8N_BASE_URL: values.N8N_BASE_URL, N8N_API_KEY: values.N8N_API_KEY }));
  });
}

/** Removes the address and the key and leaves every other line of the file as it was. */
export function clearSettings(filePath: string): Promise<boolean> {
  return serialised(() => {
    const existing = readEnvText(filePath);
    if (existing === null) {
      return false;
    }
    const present = WRITABLE_SETTINGS.some((name) =>
      new RegExp(String.raw`^\s*(?:export\s+)?${name}\s*=`, 'm').test(existing),
    );
    if (!present) {
      return false;
    }
    replaceFile(filePath, removeEnvKeys(existing, [...WRITABLE_SETTINGS]));
    return true;
  });
}
