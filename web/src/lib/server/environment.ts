import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

export type Environment = Record<string, string | undefined>;

export function rootEnvPath(workingDirectory: string = process.cwd()): string {
  return path.resolve(workingDirectory, '..', '.env');
}

export function readEnvFile(filePath: string): Record<string, string> {
  try {
    return parseEnv(readFileSync(filePath, 'utf8')) as Record<string, string>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw new Error(
      `Could not read ${path.basename(filePath)}: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
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
