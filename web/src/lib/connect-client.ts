import type { Diagnosis } from 'greenlight';
import { failureOf, silence } from './api-client';
import { ApiFailure } from './failure';
import { asBoolean, asRecord } from './scan-result';
import { parseDiagnosis } from './setup-status';

export const CONNECT_ENDPOINT = '/api/connect';

export type ConnectNotice = 'processEnv';

export interface ConnectResult {
  saved: boolean;
  diagnosis: Diagnosis;
  notice: ConnectNotice | null;
}

export interface DisconnectResult {
  disconnected: boolean;
  notice: ConnectNotice | null;
}

async function send(payload: object, signal: AbortSignal, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(CONNECT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

function noticeOf(fields: Record<string, unknown>): ConnectNotice | null {
  return fields['notice'] === 'processEnv' ? 'processEnv' : null;
}

export async function requestConnect(
  baseUrl: string,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
  checkUpdates?: boolean,
): Promise<ConnectResult> {
  const body = await send(
    { action: 'connect', baseUrl, apiKey, ...(checkUpdates === undefined ? {} : { checkUpdates }) },
    signal,
    fetchImpl,
  );
  try {
    const fields = asRecord(body, 'the answer');
    return {
      saved: asBoolean(fields['saved'], 'saved'),
      diagnosis: parseDiagnosis(fields['diagnosis']),
      notice: noticeOf(fields),
    };
  } catch {
    throw new ApiFailure('invalidAnswer');
  }
}

export async function requestDisconnect(signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<DisconnectResult> {
  const body = await send({ action: 'disconnect' }, signal, fetchImpl);
  try {
    const fields = asRecord(body, 'the answer');
    return { disconnected: asBoolean(fields['disconnected'], 'disconnected'), notice: noticeOf(fields) };
  } catch {
    throw new ApiFailure('invalidAnswer');
  }
}
