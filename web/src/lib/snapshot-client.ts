import { failureOf, silence } from './api-client';
import { ApiFailure } from './failure';
import { parseLiveSnapshot, type LiveSnapshot } from './live-snapshot';

export const SCAN_ENDPOINT = '/api/scan';

export class RefreshRefusedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('A scan ran moments ago.');
    this.name = 'RefreshRefusedError';
  }
}

async function call(
  method: 'GET' | 'POST',
  signal: AbortSignal,
  fetchImpl: typeof fetch,
): Promise<LiveSnapshot> {
  let response: Response;
  try {
    response = await fetchImpl(SCAN_ENDPOINT, { method, signal, cache: 'no-store' });
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    throw silence();
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after'));
    throw new RefreshRefusedError(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30);
  }
  if (!response.ok) {
    throw failureOf(response, body);
  }
  try {
    return parseLiveSnapshot(body);
  } catch {
    throw new ApiFailure('invalidAnswer');
  }
}

export function fetchSnapshot(signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<LiveSnapshot> {
  return call('GET', signal, fetchImpl);
}

export function requestScan(signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<LiveSnapshot> {
  return call('POST', signal, fetchImpl);
}
