import { closeSync, fstatSync, lstatSync, openSync, readSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

export type Environment = Record<string, string | undefined>;

export const MAX_ENV_FILE_BYTES = 64 * 1024;

export class EnvFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvFileError';
  }
}

export function rootEnvPath(workingDirectory: string = process.cwd()): string {
  return path.resolve(workingDirectory, '..', '.env');
}

function codeOf(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === 'string' ? code : 'unknown error';
}

function readLimited(filePath: string): string {
  const descriptor = openSync(filePath, 'r');
  try {
    const stats = fstatSync(descriptor);
    if (!stats.isFile()) {
      throw new EnvFileError('The .env entry is not a regular file.');
    }
    if (stats.size > MAX_ENV_FILE_BYTES) {
      throw new EnvFileError(`The .env file is larger than ${MAX_ENV_FILE_BYTES / 1024} KiB, which is not a settings file.`);
    }
    const buffer = Buffer.alloc(MAX_ENV_FILE_BYTES + 1);
    const read = readSync(descriptor, buffer, 0, buffer.length, 0);
    if (read > MAX_ENV_FILE_BYTES) {
      throw new EnvFileError(`The .env file is larger than ${MAX_ENV_FILE_BYTES / 1024} KiB, which is not a settings file.`);
    }
    return buffer.toString('utf8', 0, read);
  } finally {
    closeSync(descriptor);
  }
}

/**
 * Reads the settings file without following links and without trusting its size. Every
 * failure is an EnvFileError whose message is safe to show: it names the problem and never
 * the path or the contents.
 */
export function readEnvFile(filePath: string): Record<string, string> {
  try {
    if (lstatSync(filePath).isSymbolicLink()) {
      throw new EnvFileError('The .env file is a symbolic link, which GreenLight does not follow. Use a regular file.');
    }
    return parseEnv(readLimited(filePath)) as Record<string, string>;
  } catch (error) {
    if (error instanceof EnvFileError) {
      throw error;
    }
    const code = codeOf(error);
    if (code === 'ENOENT') {
      return {};
    }
    throw new EnvFileError(`The .env file cannot be read (${code}).`);
  }
}

function definedValues(source: Environment): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, string] => entry[1] !== undefined && entry[1].trim() !== '',
    ),
  );
}

/**
 * The settings the dashboard runs with: the .env file at the root of the project, read
 * again on every call so that running the setup in another terminal takes effect without a
 * restart, overridden by anything set in the process environment, such as web/.env.local.
 * Blank process values count as unset so a copied template cannot hide the real ones.
 */
export function currentEnvironment(
  processEnv: Environment = process.env,
  filePath: string = rootEnvPath(),
): Environment {
  return { ...readEnvFile(filePath), ...definedValues(processEnv) };
}

export function describeEnvironmentProblem(error: unknown): string {
  return error instanceof EnvFileError ? error.message : 'The settings could not be read.';
}
