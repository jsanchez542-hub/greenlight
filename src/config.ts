import type { Severity } from './analysis/types.js';
import { commandName } from './command.js';
import { DEFAULT_CONCURRENCY, MAX_CONCURRENCY } from './concurrency.js';
import { messagesFor, type Lang } from './i18n/index.js';

export interface Config {
  baseUrl: string;
  apiKey: string;
  executionLimit: number;
  detailSampleSize: number;
  concurrency: number;
  allowInsecureHttp: boolean;
}

const defaults = {
  executionLimit: 200,
  detailSampleSize: 5,
  concurrency: DEFAULT_CONCURRENCY,
};

function readPositiveInteger(raw: string | undefined, fallback: number, name: string, lang: Lang): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(messagesFor(lang).config.notPositive(name, raw));
  }
  return value;
}

function readConcurrency(raw: string | undefined, lang: Lang): number {
  const name = 'GREENLIGHT_CONCURRENCY';
  const value = readPositiveInteger(raw, defaults.concurrency, name, lang);
  if (value > MAX_CONCURRENCY) {
    throw new Error(messagesFor(lang).config.tooHigh(name, raw ?? '', MAX_CONCURRENCY));
  }
  return value;
}

export function loadConfig(env: Record<string, string | undefined>, lang: Lang = 'en'): Config {
  const baseUrl = env['N8N_BASE_URL']?.trim();
  const apiKey = env['N8N_API_KEY']?.trim();

  if (!baseUrl || !apiKey) {
    throw new Error(messagesFor(lang).config.missingConnection(commandName(env)));
  }

  const insecure = env['GREENLIGHT_ALLOW_INSECURE_HTTP']?.trim().toLowerCase();

  return {
    baseUrl,
    apiKey,
    allowInsecureHttp: insecure === '1' || insecure === 'true',
    executionLimit: readPositiveInteger(
      env['GREENLIGHT_EXECUTION_LIMIT'],
      defaults.executionLimit,
      'GREENLIGHT_EXECUTION_LIMIT',
      lang,
    ),
    detailSampleSize: readPositiveInteger(
      env['GREENLIGHT_DETAIL_SAMPLE'],
      defaults.detailSampleSize,
      'GREENLIGHT_DETAIL_SAMPLE',
      lang,
    ),
    concurrency: readConcurrency(env['GREENLIGHT_CONCURRENCY'], lang),
  };
}

export interface WatchConfig {
  webhookUrl: string | null;
  webhookToken: string | null;
  intervalMinutes: number;
  stateFile: string;
  notifyMinimum: Severity;
}

function readSeverity(raw: string | undefined, lang: Lang): Severity {
  const value = raw?.trim().toLowerCase();
  if (value === undefined || value === '') {
    return 'warning';
  }
  if (value === 'warning' || value === 'critical') {
    return value;
  }
  throw new Error(messagesFor(lang).config.badSeverity(raw ?? ''));
}

function readWebhookUrl(raw: string | undefined, lang: Lang): string | null {
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
  throw new Error(messagesFor(lang).config.badWebhook);
}

export function loadWatchConfig(env: Record<string, string | undefined>, lang: Lang = 'en'): WatchConfig {
  const token = env['GREENLIGHT_WEBHOOK_TOKEN']?.trim();
  return {
    webhookUrl: readWebhookUrl(env['GREENLIGHT_WEBHOOK_URL'], lang),
    webhookToken: token === undefined || token === '' ? null : token,
    intervalMinutes: readPositiveInteger(env['GREENLIGHT_INTERVAL_MINUTES'], 5, 'GREENLIGHT_INTERVAL_MINUTES', lang),
    stateFile: env['GREENLIGHT_STATE_FILE']?.trim() || '.greenlight-state.json',
    notifyMinimum: readSeverity(env['GREENLIGHT_NOTIFY_MIN'], lang),
  };
}
