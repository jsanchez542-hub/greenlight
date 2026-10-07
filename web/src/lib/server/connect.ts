import { diagnose as runDiagnosis, hasControlCharacters, type Diagnosis, type DiagnoseInput } from 'greenlight';
import type { Lang } from '@/i18n';
import type { FailureCode } from '../failure';
import { EnvFileError, environmentProblem, type Environment } from './environment';
import { checkInstanceUrl } from './instance-url';
import { RateLimiter } from './rate-limit';
import { CONNECTION_SETTINGS, clearSettings, saveSettings } from './settings-writer';
import { answer, isSetInProcess, readWriteRequest, refuse } from './write-request';

export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_FIELD_LENGTH = 2048;

const OVERRIDDEN = 'processEnv';
const SETTINGS_IN_PLAY = [...CONNECTION_SETTINGS, 'GREENLIGHT_CHECK_UPDATES'];

export interface ConnectContext {
  host: string | null;
  lang: Lang;
  env: Environment;
  processEnv: Environment;
  filePath: string;
  limiter: RateLimiter;
  diagnose?: (input: DiagnoseInput) => Promise<Diagnosis>;
  save?: typeof saveSettings;
  clear?: typeof clearSettings;
}

export function createLimiter(now?: () => number): RateLimiter {
  return new RateLimiter({ minGapMs: 1000, maxPerWindow: 20, windowMs: 60_000, ...(now === undefined ? {} : { now }) });
}

function redact(diagnosis: Diagnosis, secrets: string[]): Diagnosis {
  const clean = (text: string): string => secrets.reduce((result, secret) => result.split(secret).join('[redacted]'), text);
  return {
    ...diagnosis,
    host: diagnosis.host === null ? null : clean(diagnosis.host),
    steps: diagnosis.steps.map((step) => ({
      ...step,
      label: clean(step.label),
      detail: clean(step.detail),
      ...(step.hint === undefined ? {} : { hint: clean(step.hint) }),
    })),
  };
}

interface Fields {
  action: string;
  baseUrl: string;
  apiKey: string;
  checkUpdates: boolean | null | 'invalid';
}

function readFields(value: unknown): Fields | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const text = (name: string): string => (typeof record[name] === 'string' ? (record[name] as string) : '');
  const choice = record['checkUpdates'];
  return {
    action: text('action'),
    baseUrl: text('baseUrl'),
    apiKey: text('apiKey'),
    checkUpdates: choice === undefined ? null : typeof choice === 'boolean' ? choice : 'invalid',
  };
}

function validateConnect(fields: Fields): FailureCode | null {
  const baseUrl = fields.baseUrl.trim();
  const apiKey = fields.apiKey.trim();
  if (fields.checkUpdates === 'invalid') {
    return 'notUnderstood';
  }
  if (baseUrl === '' || apiKey === '') {
    return 'fieldsMissing';
  }
  if (baseUrl.length > MAX_FIELD_LENGTH || apiKey.length > MAX_FIELD_LENGTH) {
    return 'fieldsTooLong';
  }
  if (hasControlCharacters(baseUrl) || hasControlCharacters(apiKey)) {
    return 'fieldsControl';
  }
  return null;
}

function allowsInsecureHttp(env: Environment): boolean {
  return ['1', 'true'].includes((env['GREENLIGHT_ALLOW_INSECURE_HTTP'] ?? '').trim().toLowerCase());
}

async function connect(fields: Fields, context: ConnectContext): Promise<Response> {
  const problem = validateConnect(fields);
  if (problem !== null) {
    return refuse(problem, 400);
  }
  const baseUrl = fields.baseUrl.trim();
  const apiKey = fields.apiKey.trim();
  const allowInsecureHttp = allowsInsecureHttp(context.env);

  const diagnosis = redact(
    await (context.diagnose ?? runDiagnosis)({ baseUrl, apiKey, allowInsecureHttp, lang: context.lang }),
    [apiKey],
  );
  if (!diagnosis.ok || !checkInstanceUrl(baseUrl, allowInsecureHttp).ok) {
    return answer({ saved: false, diagnosis, notice: null });
  }

  await (context.save ?? saveSettings)(context.filePath, {
    N8N_BASE_URL: baseUrl,
    N8N_API_KEY: apiKey,
    ...(typeof fields.checkUpdates === 'boolean' ? { GREENLIGHT_CHECK_UPDATES: fields.checkUpdates ? '1' : '0' } : {}),
  });
  return answer({
    saved: true,
    diagnosis,
    notice: isSetInProcess(context.processEnv, SETTINGS_IN_PLAY) ? OVERRIDDEN : null,
  });
}

async function disconnect(context: ConnectContext): Promise<Response> {
  await (context.clear ?? clearSettings)(context.filePath);
  const stillSet = isSetInProcess(context.processEnv, CONNECTION_SETTINGS);
  return answer({ disconnected: !stillSet, notice: stillSet ? OVERRIDDEN : null });
}

/**
 * Saves or removes the address and the key of the n8n instance. Every check that can refuse a
 * request runs before anything is read from it, and nothing is written unless the connection
 * has just been proven to work. The answer never contains the key or the path of the file.
 */
export async function handleConnect(request: Request, context: ConnectContext): Promise<Response> {
  const received = await readWriteRequest(request, {
    host: context.host,
    env: context.env,
    limiter: context.limiter,
    maxBytes: MAX_BODY_BYTES,
  });
  if (!received.ok) {
    return received.response;
  }

  const fields = readFields(received.value);
  if (fields === null) {
    return refuse('notUnderstood', 400);
  }

  try {
    if (fields.action === 'connect') {
      return await connect(fields, context);
    }
    if (fields.action === 'disconnect') {
      return await disconnect(context);
    }
    return refuse('notUnderstood', 400);
  } catch (error) {
    return error instanceof EnvFileError ? refuse(environmentProblem(error), 409) : refuse('saveFailed', 500);
  }
}
