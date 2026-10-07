import { headers } from 'next/headers';
import { apiError, apiJson, authorize, methodNotAllowed, optionsResponse } from '@/lib/server/api';
import { currentEnvironment, envFilePath, type Environment } from '@/lib/server/environment';
import { RateLimiter } from '@/lib/server/rate-limit';
import { handleUpdateChoice, readUpdates } from '@/lib/server/updates';

export const dynamic = 'force-dynamic';

const ALLOW = 'GET, POST, OPTIONS';
const reads = new RateLimiter({ minGapMs: 0, maxPerWindow: 60, windowMs: 60_000 });
const choices = new RateLimiter({ minGapMs: 1000, maxPerWindow: 20, windowMs: 60_000 });

function readableEnvironment(): Environment {
  try {
    return currentEnvironment();
  } catch {
    return {};
  }
}

export async function GET(request: Request): Promise<Response> {
  const access = await authorize(request);
  if ('refusal' in access) {
    return access.refusal;
  }
  const turn = reads.check();
  if (!turn.allowed) {
    return apiError('rateLimited', 429, { 'Retry-After': String(turn.retryAfterSeconds) }, turn.retryAfterSeconds);
  }
  return apiJson(await readUpdates(access.env));
}

export async function POST(request: Request): Promise<Response> {
  const host = (await headers()).get('host');
  try {
    return await handleUpdateChoice(request, {
      host,
      env: readableEnvironment(),
      processEnv: process.env,
      filePath: envFilePath(),
      limiter: choices,
    });
  } catch {
    return apiError('saveFailed', 500);
  }
}

export const OPTIONS = optionsResponse(ALLOW);
export const HEAD = methodNotAllowed(ALLOW);
export const PUT = methodNotAllowed(ALLOW);
export const PATCH = methodNotAllowed(ALLOW);
export const DELETE = methodNotAllowed(ALLOW);
