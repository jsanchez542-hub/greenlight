import { parseSetupStatus, type SetupStatus } from './setup-status';

export const SETUP_ENDPOINT = '/api/setup';

function errorMessageIn(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return undefined;
}

export async function fetchSetupStatus(
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<SetupStatus> {
  let response: Response;
  try {
    response = await fetchImpl(SETUP_ENDPOINT, { signal, cache: 'no-store' });
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
  return parseSetupStatus(body);
}
