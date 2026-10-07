import { failureOf, silence } from './api-client';
import { ApiFailure } from './failure';
import { asRecord } from './scan-result';
import { parseUpdateState, type UpdateState } from './update-notice';

export const UPDATE_ENDPOINT = '/api/update';

export interface UpdateChoiceResult {
  enabled: boolean;
  notice: 'processEnv' | null;
}

async function call(init: RequestInit, signal: AbortSignal, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(UPDATE_ENDPOINT, {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      referrerPolicy: 'no-referrer',
      signal,
    });
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
  return body;
}

export async function fetchUpdateState(signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<UpdateState> {
  const body = await call({ method: 'GET' }, signal, fetchImpl);
  try {
    return parseUpdateState(body);
  } catch {
    throw new ApiFailure('invalidAnswer');
  }
}

export async function requestUpdateChoice(
  enabled: boolean,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<UpdateChoiceResult> {
  const body = await call(
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) },
    signal,
    fetchImpl,
  );
  try {
    const fields = asRecord(body, 'the answer');
    return { enabled: fields['enabled'] === true, notice: fields['notice'] === 'processEnv' ? 'processEnv' : null };
  } catch {
    throw new ApiFailure('invalidAnswer');
  }
}
