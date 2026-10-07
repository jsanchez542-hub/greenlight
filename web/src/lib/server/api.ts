import { headers } from 'next/headers';
import type { FailureCode } from '../failure';
import { currentEnvironment, environmentProblem, type Environment } from './environment';
import { guardRequest } from './guard';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function apiJson(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

export function apiError(
  code: FailureCode,
  status: number,
  extra: Record<string, string> = {},
  retryAfterSeconds?: number,
): Response {
  return apiJson(retryAfterSeconds === undefined ? { error: code } : { error: code, retryAfterSeconds }, status, extra);
}

/**
 * Settings and the request checks that every route starts with. A host that is not allowed
 * is refused before anything about the settings is said.
 */
export async function authorize(request: Request): Promise<{ env: Environment } | { refusal: Response }> {
  let env: Environment = {};
  let problem: FailureCode | null = null;
  try {
    env = currentEnvironment();
  } catch (error) {
    problem = environmentProblem(error);
  }

  const verdict = guardRequest(
    {
      method: request.method,
      host: (await headers()).get('host'),
      fetchSite: request.headers.get('sec-fetch-site'),
    },
    env,
  );
  if (!verdict.allowed) {
    return { refusal: apiError(verdict.code, verdict.status) };
  }
  if (problem !== null) {
    return { refusal: apiError(problem, 500) };
  }
  return { env };
}

export function methodNotAllowed(allow: string): () => Response {
  return () => apiError('methodNotAllowed', 405, { Allow: allow });
}

export function optionsResponse(allow: string): () => Response {
  return () => new Response(null, { status: 204, headers: { ...NO_STORE, Allow: allow } });
}
