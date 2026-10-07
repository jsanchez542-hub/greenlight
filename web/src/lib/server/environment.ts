import { closeSync, fstatSync, lstatSync, openSync, readSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

export type Environment = Record<string, string | undefined>;

export const MAX_ENV_FILE_BYTES = 64 * 1024;
export const ENV_FILE_VARIABLE = 'GREENLIGHT_ENV_FILE';

export class EnvFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvFileError';
  }
}

export function rootEnvPath(workingDirectory: string = process.cwd()): string {
  return path.resolve(workingDirectory, '..', '.env');
}

/**
 * Where the settings live. Normally the .env at the root of the project; the process
 * environment may point elsewhere, which is how tests and unusual installs keep the real file
 * out of it. The file itself can never redirect this, because it is read from the process only.
 */
export function envFilePath(processEnv: Environment = process.env, workingDirectory?: string): string {
  const override = processEnv[ENV_FILE_VARIABLE]?.trim();
  return override === undefined || override === '' ? rootEnvPath(workingDirectory) : path.resolve(override);
}

function codeOf(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === 'string' ? code : 'unknown error';
}

function tooLarge(): EnvFileError {
  return new EnvFileError(`The .env file is larger than ${MAX_ENV_FILE_BYTES / 1024} KiB, which is not a settings file.`);
}

function readLimited(filePath: string): string {
  const descriptor = openSync(filePath, 'r');
  try {
    const stats = fstatSync(descriptor);
    if (!stats.isFile()) {
      throw new EnvFileError('The .env entry is not a regular file.');
    }
    if (stats.size > MAX_ENV_FILE_BYTES) {
      throw tooLarge();
    }
    const buffer = Buffer.alloc(MAX_ENV_FILE_BYTES + 1);
    const read = readSync(descriptor, buffer, 0, buffer.length, 0);
    if (read > MAX_ENV_FILE_BYTES) {
      throw tooLarge();
    }
    return buffer.toString('utf8', 0, read);
  } finally {
    closeSync(descriptor);
  }
}

/**
 * The text of the settings file, or null when there is none. It is read without following
 * links and without trusting its size. Every failure is an EnvFileError whose message is safe
 * to show: it names the problem and never the path or the contents.
 */
export function readEnvText(filePath: string): string | null {
  try {
    if (lstatSync(filePath).isSymbolicLink()) {
      throw new EnvFileError('The .env file is a symbolic link, which GreenLight does not follow. Use a regular file.');
    }
    return readLimited(filePath);
  } catch (error) {
    if (error instanceof EnvFileError) {
      throw error;
    }
    const code = codeOf(error);
    if (code === 'ENOENT') {
      return null;
    }
    throw new EnvFileError(`The .env file cannot be read (${code}).`);
  }
}

export function readEnvFile(filePath: string): Record<string, string> {
  const text = readEnvText(filePath);
  return text === null ? {} : (parseEnv(text) as Record<string, string>);
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
  filePath: string = envFilePath(processEnv),
): Environment {
  return { ...readEnvFile(filePath), ...definedValues(processEnv) };
}

export function describeEnvironmentProblem(error: unknown): string {
  return error instanceof EnvFileError ? error.message : 'The settings could not be read.';
}
