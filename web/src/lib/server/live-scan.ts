import { N8nClient, loadConfig, scan, type ScanResult } from 'greenlight';

type Environment = Record<string, string | undefined>;

const REDACTED = '[redacted]';

let inFlight: Promise<ScanResult> | null = null;

export function isLiveScanConfigured(env: Environment = process.env): boolean {
  return Boolean(env['N8N_BASE_URL']?.trim() && env['N8N_API_KEY']?.trim());
}

async function execute(env: Environment): Promise<ScanResult> {
  const config = loadConfig(env);
  const client = new N8nClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
  return scan(client, {
    executionLimit: config.executionLimit,
    detailSampleSize: config.detailSampleSize,
  });
}

export function runLiveScan(env: Environment = process.env): Promise<ScanResult> {
  inFlight ??= execute(env).finally(() => {
    inFlight = null;
  });
  return inFlight;
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

function messageOf(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'unknown error';
  }
  const cause = error.cause instanceof Error ? error.cause.message : undefined;
  return cause === undefined ? error.message : `${error.message} (${cause})`;
}

export function describeScanFailure(error: unknown, env: Environment = process.env): string {
  const message = `The scan could not finish: ${messageOf(error)}`;
  return secretsIn(env).reduce((text, secret) => text.split(secret).join(REDACTED), message);
}
