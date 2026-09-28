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
      'Set N8N_BASE_URL and N8N_API_KEY before running GreenLight. Copy .env.example to .env for a starting point.',
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
