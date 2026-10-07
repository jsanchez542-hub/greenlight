import type { Diagnosis } from 'greenlight';
import { parseDiagnosis } from './setup-status';
import { asBoolean, asRecord, asString } from './scan-result';

export const CONNECT_ENDPOINT = '/api/connect';

export interface ConnectResult {
  saved: boolean;
  diagnosis: Diagnosis;
  notice: string | null;
}

export interface DisconnectResult {
  disconnected: boolean;
  notice: string | null;
}

function errorMessageIn(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return undefined;
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
    throw new Error('The dashboard did not answer. Check that it is still running.');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorMessageIn(body) ?? `The dashboard answered with status ${response.status}.`);
  }
  return body;
}

function noticeOf(fields: Record<string, unknown>): string | null {
  return fields['notice'] === null ? null : asString(fields['notice'], 'notice');
}

export async function requestConnect(
  baseUrl: string,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ConnectResult> {
  const fields = asRecord(await send({ action: 'connect', baseUrl, apiKey }, signal, fetchImpl), 'the answer');
  return {
    saved: asBoolean(fields['saved'], 'saved'),
    diagnosis: parseDiagnosis(fields['diagnosis']),
    notice: noticeOf(fields),
  };
}

export async function requestDisconnect(signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<DisconnectResult> {
  const fields = asRecord(await send({ action: 'disconnect' }, signal, fetchImpl), 'the answer');
  return { disconnected: asBoolean(fields['disconnected'], 'disconnected'), notice: noticeOf(fields) };
}
