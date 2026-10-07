import type { FailureCode } from '../failure';
import { readLimitedText } from './body';
import type { Environment } from './environment';
import { guardWrite } from './guard';
import type { RateLimiter } from './rate-limit';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function answer(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

export function refuse(
  code: FailureCode,
  status: number,
  extra: Record<string, string> = {},
  retryAfterSeconds?: number,
): Response {
  return answer(retryAfterSeconds === undefined ? { error: code } : { error: code, retryAfterSeconds }, status, extra);
}

export interface WriteGate {
  host: string | null;
  env: Environment;
  limiter: RateLimiter;
  maxBytes: number;
}

export type WriteRequest = { ok: true; value: unknown } | { ok: false; response: Response };

/**
 * Every check that can refuse a request that changes something, in the order that tells an
 * attacker the least: who is asking, in what format, how often, how much, and only then what.
 * Nothing is read from the body before the earlier checks have passed.
 */
export async function readWriteRequest(request: Request, gate: WriteGate): Promise<WriteRequest> {
  const verdict = guardWrite(
    {
      method: request.method,
      host: gate.host,
      fetchSite: request.headers.get('sec-fetch-site'),
      origin: request.headers.get('origin'),
    },
    gate.env,
  );
  if (!verdict.allowed) {
    return { ok: false, response: refuse(verdict.code, verdict.status) };
  }
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return { ok: false, response: refuse('notJson', 415) };
  }

  const turn = gate.limiter.check();
  if (!turn.allowed) {
    return {
      ok: false,
      response: refuse('rateLimited', 429, { 'Retry-After': String(turn.retryAfterSeconds) }, turn.retryAfterSeconds),
    };
  }

  const body = await readLimitedText(request, gate.maxBytes);
  if (!body.ok) {
    return { ok: false, response: refuse('tooLarge', 413) };
  }
  try {
    return { ok: true, value: JSON.parse(body.text) };
  } catch {
    return { ok: false, response: refuse('notUnderstood', 400) };
  }
}

export function isSetInProcess(processEnv: Environment, names: readonly string[]): boolean {
  return names.some((name) => (processEnv[name] ?? '').trim() !== '');
}
