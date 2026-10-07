import { messagesFor, type Lang, type Messages } from '../i18n/index.js';
import { N8nApiError, N8nClient } from '../n8n/client.js';
import { isPrivateHost } from '../n8n/network.js';

export type StepId = 'address' | 'reach' | 'authenticate' | 'executions';
export type StepStatus = 'ok' | 'failed' | 'skipped';

export interface CheckStep {
  id: StepId;
  label: string;
  status: StepStatus;
  /** What happened, in one sentence. */
  detail: string;
  /** What to do about it. Present on failures and on warnings. */
  hint?: string;
}

export interface Diagnosis {
  ok: boolean;
  steps: CheckStep[];
  workflowCount: number | null;
  /** Host only, never the full address. */
  host: string | null;
}

export interface DiagnoseInput {
  baseUrl: string | undefined;
  apiKey: string | undefined;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  allowInsecureHttp?: boolean;
  /** The language the steps, details and hints are written in. */
  lang?: Lang;
}

function stepper(t: Messages) {
  return (id: StepId, status: StepStatus, detail: string, hint?: string): CheckStep =>
    hint === undefined
      ? { id, label: t.diagnose.labels[id], status, detail }
      : { id, label: t.diagnose.labels[id], status, detail, hint };
}

const tlsCodes = new Set([
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

function codeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const { code, cause } = error as { code?: unknown; cause?: unknown };
  if (typeof code === 'string') {
    return code;
  }
  return cause === undefined ? undefined : codeOf(cause);
}

function explainNetworkFailure(error: unknown, timeoutMs: number, t: Messages): { detail: string; hint: string } {
  const d = t.diagnose;
  if (error instanceof Error && error.name === 'TimeoutError') {
    return { detail: d.timeout.detail(Math.round(timeoutMs / 1000)), hint: d.timeout.hint };
  }

  const code = codeOf(error);
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return d.unresolved;
  }
  if (code === 'ECONNREFUSED') {
    return d.refused;
  }
  if (code !== undefined && tlsCodes.has(code)) {
    return d.untrustedCertificate;
  }
  return {
    detail: d.connectionFailed.detail,
    hint: d.connectionFailed.hint(error instanceof Error ? error.message : t.cli.unknownError),
  };
}

function explainStatus(status: number, t: Messages): { stage: 'authenticate' | 'reach'; detail: string; hint: string } {
  const d = t.diagnose;
  if (status === 401) {
    return { stage: 'authenticate', ...d.status401 };
  }
  if (status === 403) {
    return { stage: 'authenticate', ...d.status403 };
  }
  if (status === 404) {
    return { stage: 'reach', ...d.status404 };
  }
  if (status >= 300 && status < 400) {
    return { stage: 'reach', ...d.redirect };
  }
  return { stage: 'reach', detail: d.serverError.detail(status), hint: d.serverError.hint };
}

function checkAddress(
  raw: string | undefined,
  allowInsecureHttp: boolean,
  t: Messages,
): { steps: CheckStep[]; url?: URL } {
  const d = t.diagnose;
  const step = stepper(t);
  const failed = (detail: string, hint: string): { steps: CheckStep[] } => ({
    steps: [step('address', 'failed', detail, hint)],
  });

  const value = raw?.trim();
  if (value === undefined || value === '') {
    return failed(d.noAddress.detail, d.noAddress.hint);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return failed(d.invalidAddress.detail, d.invalidAddress.hint);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return failed(d.badProtocol.detail, d.badProtocol.hint);
  }
  if (url.username !== '' || url.password !== '') {
    return failed(d.hasCredentials.detail, d.hasCredentials.hint);
  }
  if (/\/api\/v1\/?$/.test(url.pathname)) {
    return failed(d.hasApiPath.detail, d.hasApiPath.hint);
  }

  if (url.protocol === 'http:' && !isPrivateHost(url.hostname)) {
    if (!allowInsecureHttp) {
      return failed(d.insecurePublic.detail, t.client.insecureHttp);
    }
    return { url, steps: [step('address', 'ok', d.addressOk, d.insecureAllowed)] };
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    return { url, steps: [step('address', 'ok', d.addressOk, d.privateHttp)] };
  }
  return { url, steps: [step('address', 'ok', d.addressOk)] };
}

/**
 * Walks from the address to reading execution history and stops at the first step that
 * fails, saying what went wrong and what to do about it. The API key is never part of
 * the result.
 */
export async function diagnose(input: DiagnoseInput): Promise<Diagnosis> {
  const lang = input.lang ?? 'en';
  const t = messagesFor(lang);
  const d = t.diagnose;
  const step = stepper(t);
  const timeoutMs = input.timeoutMs ?? 10_000;
  const fetchImpl = input.fetch ?? globalThis.fetch;
  const { steps, url } = checkAddress(input.baseUrl, input.allowInsecureHttp === true, t);
  const host = url?.host ?? null;

  const skipRest = (from: StepId[]): CheckStep[] => from.map((id) => step(id, 'skipped', d.skipped));

  if (url === undefined) {
    return {
      ok: false,
      steps: [...steps, ...skipRest(['reach', 'authenticate', 'executions'])],
      workflowCount: null,
      host,
    };
  }

  const apiKey = input.apiKey?.trim();
  if (apiKey === undefined || apiKey === '') {
    return {
      ok: false,
      steps: [
        ...steps,
        step('reach', 'skipped', d.noKeyReach),
        step('authenticate', 'failed', d.noKey.detail, d.noKey.hint),
        ...skipRest(['executions']),
      ],
      workflowCount: null,
      host,
    };
  }

  const timedFetch = ((target: string | URL | Request, init?: RequestInit) =>
    fetchImpl(target, { ...init, signal: AbortSignal.timeout(timeoutMs) })) as typeof globalThis.fetch;
  const client = new N8nClient({
    baseUrl: url.toString(),
    apiKey,
    fetch: timedFetch,
    allowInsecureHttp: input.allowInsecureHttp === true,
    lang,
  });

  let workflowCount: number;
  try {
    workflowCount = (await client.listWorkflows()).length;
  } catch (error) {
    if (error instanceof N8nApiError) {
      const explained = explainStatus(error.status, t);
      const reached = step('reach', 'ok', d.reached);
      if (explained.stage === 'authenticate') {
        return {
          ok: false,
          steps: [...steps, reached, step('authenticate', 'failed', explained.detail, explained.hint), ...skipRest(['executions'])],
          workflowCount: null,
          host,
        };
      }
      return {
        ok: false,
        steps: [
          ...steps,
          step('reach', 'failed', explained.detail, explained.hint),
          ...skipRest(['authenticate', 'executions']),
        ],
        workflowCount: null,
        host,
      };
    }

    const explained = explainNetworkFailure(error, timeoutMs, t);
    return {
      ok: false,
      steps: [...steps, step('reach', 'failed', explained.detail, explained.hint), ...skipRest(['authenticate', 'executions'])],
      workflowCount: null,
      host,
    };
  }

  const reach = step('reach', 'ok', d.reached);
  const authenticate = step('authenticate', 'ok', d.keyWorks(workflowCount));

  try {
    await client.listExecutions({ limit: 1 });
  } catch (error) {
    const detail = error instanceof N8nApiError && error.status === 403 ? d.executionsDenied : d.executionsFailed;
    return {
      ok: false,
      steps: [...steps, reach, authenticate, step('executions', 'failed', detail, d.executionsHint)],
      workflowCount,
      host,
    };
  }

  return {
    ok: true,
    steps: [...steps, reach, authenticate, step('executions', 'ok', d.executionsOk)],
    workflowCount,
    host,
  };
}
