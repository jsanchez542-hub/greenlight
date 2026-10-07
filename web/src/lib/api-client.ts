import { ApiFailure, parseFailureCode } from './failure';

function secondsIn(body: unknown, response: Response): number | null {
  const fromBody =
    typeof body === 'object' && body !== null && 'retryAfterSeconds' in body ? Number(body.retryAfterSeconds) : NaN;
  const seconds = Number.isFinite(fromBody) ? fromBody : Number(response.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}

/** What went wrong, as a code the page words itself. Nothing the server said is shown as it came. */
export function failureOf(response: Response, body: unknown): ApiFailure {
  const code = typeof body === 'object' && body !== null && 'error' in body ? parseFailureCode(body.error) : null;
  return new ApiFailure(code ?? 'serverStatus', secondsIn(body, response));
}

export function silence(): ApiFailure {
  return new ApiFailure('serverSilent');
}
