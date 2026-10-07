import { failureOf, silence } from './api-client';
import { ApiFailure } from './failure';
import { parseSetupStatus, type SetupStatus } from './setup-status';

export const SETUP_ENDPOINT = '/api/setup';

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
    throw silence();
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw failureOf(response, body);
  }
  try {
    return parseSetupStatus(body);
  } catch {
    throw new ApiFailure('invalidAnswer');
  }
}
