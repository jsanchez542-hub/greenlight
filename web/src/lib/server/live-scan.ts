import { N8nClient, loadConfig, scan, type ScanResult } from 'greenlight';
import { ScanCache } from './scan-cache';

type Environment = Record<string, string | undefined>;

const REDACTED = '[redacted]';
export const DEFAULT_INTERVAL_MINUTES = 5;

const holder = globalThis as typeof globalThis & { greenlightScanCache?: ScanCache };

export function isLiveScanConfigured(env: Environment = process.env): boolean {
  return Boolean(env['N8N_BASE_URL']?.trim() && env['N8N_API_KEY']?.trim());
}

export function scanIntervalMinutes(env: Environment = process.env): number {
  const value = Number(env['GREENLIGHT_SCAN_INTERVAL_MINUTES']);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_INTERVAL_MINUTES;
}

async function executeScan(env: Environment): Promise<ScanResult> {
  const config = loadConfig(env);
  const client = new N8nClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
  return scan(client, {
    executionLimit: config.executionLimit,
    detailSampleSize: config.detailSampleSize,
  });
}

export function liveCache(env: Environment = process.env): ScanCache {
  holder.greenlightScanCache ??= new ScanCache({
    scan: () => executeScan(env),
    describeFailure: (error) => describeScanFailure(error, env),
    intervalMinutes: scanIntervalMinutes(env),
  });
  return holder.greenlightScanCache;
}

function urlCredentials(baseUrl: string | undefined): string[] {
  try {
    const { username, password } = new URL(baseUrl ?? '');
    return [username, decodeURIComponent(username), password, decodeURIComponent(password)];
  } catch {
    return [];
  }
}

function secretsIn(env: Environment): string[] {
  return [env['N8N_API_KEY']?.trim(), ...urlCredentials(env['N8N_BASE_URL']?.trim())].filter(
    (secret): secret is string => Boolean(secret),
  );
}

function causeOf(error: Error): string | undefined {
  const { cause } = error;
  if (!(cause instanceof Error)) {
    return undefined;
  }
  const code = 'code' in cause && typeof cause.code === 'string' ? cause.code : undefined;
  return cause.message === '' ? code : cause.message;
}

function messageOf(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'unknown error';
  }
  const cause = causeOf(error);
  return cause === undefined ? error.message : `${error.message} (${cause})`;
}

export function describeScanFailure(error: unknown, env: Environment = process.env): string {
  const message = `The scan could not finish: ${messageOf(error)}`;
  return secretsIn(env).reduce((text, secret) => text.split(secret).join(REDACTED), message);
}
