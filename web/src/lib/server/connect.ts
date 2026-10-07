import { diagnose as runDiagnosis, hasControlCharacters, type Diagnosis, type DiagnoseInput } from 'greenlight';
import type { Lang } from '@/i18n';
import { readLimitedText } from './body';
import type { FailureCode } from '../failure';
import { EnvFileError, environmentProblem, type Environment } from './environment';
import { guardWrite } from './guard';
import { checkInstanceUrl } from './instance-url';
import { RateLimiter } from './rate-limit';
import { clearSettings, saveSettings } from './settings-writer';

export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_FIELD_LENGTH = 2048;

const NO_STORE = { 'Cache-Control': 'no-store' };
const OVERRIDDEN = 'processEnv';

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

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

function refuse(code: FailureCode, status: number, extra: Record<string, string> = {}, retryAfterSeconds?: number): Response {
  return json(retryAfterSeconds === undefined ? { error: code } : { error: code, retryAfterSeconds }, status, extra);
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

function isSetInProcess(processEnv: Environment): boolean {
  return ['N8N_BASE_URL', 'N8N_API_KEY'].some((name) => (processEnv[name] ?? '').trim() !== '');
}

interface Fields {
  action: string;
  baseUrl: string;
  apiKey: string;
}

function readFields(value: unknown): Fields | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const text = (name: string): string => (typeof record[name] === 'string' ? (record[name] as string) : '');
  return { action: text('action'), baseUrl: text('baseUrl'), apiKey: text('apiKey') };
}

function validateConnect(fields: Fields): FailureCode | null {
  const baseUrl = fields.baseUrl.trim();
  const apiKey = fields.apiKey.trim();
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
    return json({ saved: false, diagnosis, notice: null });
  }

  await (context.save ?? saveSettings)(context.filePath, { N8N_BASE_URL: baseUrl, N8N_API_KEY: apiKey });
  return json({ saved: true, diagnosis, notice: isSetInProcess(context.processEnv) ? OVERRIDDEN : null });
}

async function disconnect(context: ConnectContext): Promise<Response> {
  await (context.clear ?? clearSettings)(context.filePath);
  const stillSet = isSetInProcess(context.processEnv);
  return json({ disconnected: !stillSet, notice: stillSet ? OVERRIDDEN : null });
}

/**
 * Saves or removes the address and the key of the n8n instance. Every check that can refuse a
 * request runs before anything is read from it, and nothing is written unless the connection
 * has just been proven to work. The answer never contains the key or the path of the file.
 */
export async function handleConnect(request: Request, context: ConnectContext): Promise<Response> {
  const verdict = guardWrite(
    {
      method: request.method,
      host: context.host,
      fetchSite: request.headers.get('sec-fetch-site'),
      origin: request.headers.get('origin'),
    },
    context.env,
  );
  if (!verdict.allowed) {
    return refuse(verdict.code, verdict.status);
  }
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return refuse('notJson', 415);
  }

  const turn = context.limiter.check();
  if (!turn.allowed) {
    return refuse('rateLimited', 429, { 'Retry-After': String(turn.retryAfterSeconds) }, turn.retryAfterSeconds);
  }

  const body = await readLimitedText(request, MAX_BODY_BYTES);
  if (!body.ok) {
    return refuse('tooLarge', 413);
  }

  let fields: Fields | null;
  try {
    fields = readFields(JSON.parse(body.text));
  } catch {
    fields = null;
  }
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
