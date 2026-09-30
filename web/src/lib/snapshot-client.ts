import { parseLiveSnapshot, type LiveSnapshot } from './live-snapshot';

export const SCAN_ENDPOINT = '/api/scan';

function errorMessageIn(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return undefined;
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
    throw new Error('The dashboard server did not answer. Check that it is still running.');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorMessageIn(body) ?? `The server answered with status ${response.status}.`);
  }
  return parseLiveSnapshot(body);
}

export function fetchSnapshot(signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<LiveSnapshot> {
  return call('GET', signal, fetchImpl);
}

export function requestScan(signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<LiveSnapshot> {
  return call('POST', signal, fetchImpl);
}
