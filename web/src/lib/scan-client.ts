import type { ScanResult } from 'greenlight';
import { parseScanResult } from './scan-result';

export const SCAN_ENDPOINT = '/api/scan';

function errorMessageIn(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return undefined;
}

async function post(signal: AbortSignal, fetchImpl: typeof fetch): Promise<Response> {
  try {
    return await fetchImpl(SCAN_ENDPOINT, { method: 'POST', signal });
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    throw new Error('The dashboard server did not answer. Check that it is still running.');
  }
}

export async function requestLiveScan(
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ScanResult> {
  const response = await post(signal, fetchImpl);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(errorMessageIn(body) ?? `The server answered with status ${response.status}.`);
  }
  return parseScanResult(body);
}
