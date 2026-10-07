import { N8nApiError, N8nClient, loadConfig, scan, type ScanResult } from 'greenlight';
import type { FailureCode } from '../failure';
import { currentEnvironment, type Environment } from './environment';
import { checkInstanceUrl } from './instance-url';
import { ScanCache } from './scan-cache';

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
        describeFailure: describeScanFailure,
        intervalMinutes: scanIntervalMinutes(env),
        host: hostOf(env),
      }),
    };
  }
  return holder.greenlightScanCache.cache;
}

const CERTIFICATE_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

function causeCode(error: Error): string | undefined {
  const { cause } = error;
  if (!(cause instanceof Error)) {
    return undefined;
  }
  return 'code' in cause && typeof cause.code === 'string' ? cause.code : undefined;
}

function statusFailure(status: number): FailureCode {
  if (status === 401) {
    return 'scanRejectedKey';
  }
  if (status === 403) {
    return 'scanForbidden';
  }
  if (status === 404) {
    return 'scanNotFound';
  }
  return status >= 500 ? 'scanServerError' : 'scanFailed';
}

/**
 * Names what went wrong without carrying any of the text of the error. The text of an error
 * can hold the address of the instance, the key or what the instance said, none of which
 * belongs in a page, so only the kind of failure travels and the page words it itself.
 */
export function describeScanFailure(error: unknown): FailureCode {
  if (error instanceof N8nApiError) {
    return statusFailure(error.status);
  }
  if (!(error instanceof Error)) {
    return 'scanFailed';
  }
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return 'scanTimeout';
  }
  const code = causeCode(error);
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'scanUnresolved';
  }
  if (code === 'ECONNREFUSED') {
    return 'scanRefused';
  }
  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') {
    return 'scanTimeout';
  }
  return code !== undefined && CERTIFICATE_CODES.has(code) ? 'scanCertificate' : 'scanFailed';
}
