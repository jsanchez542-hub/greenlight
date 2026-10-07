import { N8nClient, loadConfig, scan, type ScanResult } from 'greenlight';
import { currentEnvironment, type Environment } from './environment';
import { checkInstanceUrl } from './instance-url';
import { ScanCache } from './scan-cache';

const REDACTED = '[redacted]';
export const DEFAULT_INTERVAL_MINUTES = 5;

const SETTING_NAMES = [
  'N8N_BASE_URL',
  'N8N_API_KEY',
  'GREENLIGHT_EXECUTION_LIMIT',
  'GREENLIGHT_DETAIL_SAMPLE',
  'GREENLIGHT_SCAN_INTERVAL_MINUTES',
  'GREENLIGHT_ALLOW_INSECURE_HTTP',
] as const;

interface CacheHolder {
  greenlightScanCache?: { settings: string; cache: ScanCache };
}

const holder = globalThis as typeof globalThis & CacheHolder;

export function isLiveScanConfigured(env: Environment = currentEnvironment()): boolean {
  return Boolean(env['N8N_API_KEY']?.trim()) && checkInstanceUrl(env['N8N_BASE_URL'], allowsInsecureHttp(env)).ok;
}

function allowsInsecureHttp(env: Environment): boolean {
  return ['1', 'true'].includes((env['GREENLIGHT_ALLOW_INSECURE_HTTP'] ?? '').trim().toLowerCase());
}

export function scanIntervalMinutes(env: Environment = currentEnvironment()): number {
  const value = Number(env['GREENLIGHT_SCAN_INTERVAL_MINUTES']);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_INTERVAL_MINUTES;
}

export function hostOf(env: Environment): string | null {
  try {
    return new URL(env['N8N_BASE_URL']?.trim() ?? '').host || null;
  } catch {
    return null;
  }
}

async function executeScan(env: Environment): Promise<ScanResult> {
  const config = loadConfig(env);
  const client = new N8nClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    allowInsecureHttp: config.allowInsecureHttp,
  });
  return scan(client, {
    executionLimit: config.executionLimit,
    detailSampleSize: config.detailSampleSize,
  });
}

export function liveCache(env: Environment = currentEnvironment()): ScanCache {
  const settings = SETTING_NAMES.map((name) => env[name] ?? '').join('\n');
  if (holder.greenlightScanCache?.settings !== settings) {
    holder.greenlightScanCache = {
      settings,
      cache: new ScanCache({
        scan: () => executeScan(env),
        describeFailure: (error) => describeScanFailure(error, env),
        intervalMinutes: scanIntervalMinutes(env),
        host: hostOf(env),
      }),
    };
  }
  return holder.greenlightScanCache.cache;
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

export function describeScanFailure(error: unknown, env: Environment = currentEnvironment()): string {
  const message = `The scan could not finish: ${messageOf(error)}`;
  return secretsIn(env).reduce((text, secret) => text.split(secret).join(REDACTED), message);
}
