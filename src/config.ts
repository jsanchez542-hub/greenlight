import type { Severity } from './analysis/types.js';

export interface Config {
  baseUrl: string;
  apiKey: string;
  executionLimit: number;
  detailSampleSize: number;
}

const defaults = {
  executionLimit: 200,
  detailSampleSize: 5,
};

function readPositiveInteger(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number, received "${raw}".`);
  }
  return value;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const baseUrl = env['N8N_BASE_URL']?.trim();
  const apiKey = env['N8N_API_KEY']?.trim();

  if (!baseUrl || !apiKey) {
    throw new Error(
      'N8N_BASE_URL and N8N_API_KEY are not set. Run greenlight init for a guided setup, or set them in the environment or in a .env file.',
    );
  }

  return {
    baseUrl,
    apiKey,
    executionLimit: readPositiveInteger(
      env['GREENLIGHT_EXECUTION_LIMIT'],
      defaults.executionLimit,
      'GREENLIGHT_EXECUTION_LIMIT',
    ),
    detailSampleSize: readPositiveInteger(
      env['GREENLIGHT_DETAIL_SAMPLE'],
      defaults.detailSampleSize,
      'GREENLIGHT_DETAIL_SAMPLE',
    ),
  };
}

export interface WatchConfig {
  webhookUrl: string | null;
  webhookToken: string | null;
  intervalMinutes: number;
  stateFile: string;
  notifyMinimum: Severity;
}

function readSeverity(raw: string | undefined): Severity {
  const value = raw?.trim().toLowerCase();
  if (value === undefined || value === '') {
    return 'warning';
  }
  if (value === 'warning' || value === 'critical') {
    return value;
  }
  throw new Error(`GREENLIGHT_NOTIFY_MIN must be "warning" or "critical", received "${raw}".`);
}

function readWebhookUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (value === undefined || value === '') {
    return null;
  }
  // The value is never echoed: for chat and email services the URL is itself the secret.
  try {
    const { protocol } = new URL(value);
    if (protocol === 'http:' || protocol === 'https:') {
      return value;
    }
  } catch {
    // reported below
  }
  throw new Error('GREENLIGHT_WEBHOOK_URL must be a valid http or https URL.');
}

export function loadWatchConfig(env: Record<string, string | undefined>): WatchConfig {
  const token = env['GREENLIGHT_WEBHOOK_TOKEN']?.trim();
  return {
    webhookUrl: readWebhookUrl(env['GREENLIGHT_WEBHOOK_URL']),
    webhookToken: token === undefined || token === '' ? null : token,
    intervalMinutes: readPositiveInteger(env['GREENLIGHT_INTERVAL_MINUTES'], 5, 'GREENLIGHT_INTERVAL_MINUTES'),
    stateFile: env['GREENLIGHT_STATE_FILE']?.trim() || '.greenlight-state.json',
    notifyMinimum: readSeverity(env['GREENLIGHT_NOTIFY_MIN']),
  };
}
