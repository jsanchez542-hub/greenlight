import { INSECURE_HTTP_MESSAGE, N8nApiError, N8nClient } from '../n8n/client.js';
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
}

const labels: Record<StepId, string> = {
  address: 'The address looks valid',
  reach: 'The instance answers',
  authenticate: 'The API key is accepted',
  executions: 'Execution history is readable',
};

function step(id: StepId, status: StepStatus, detail: string, hint?: string): CheckStep {
  return hint === undefined
    ? { id, label: labels[id], status, detail }
    : { id, label: labels[id], status, detail, hint };
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

function explainNetworkFailure(error: unknown, timeoutMs: number): { detail: string; hint: string } {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return {
      detail: `The instance did not answer within ${Math.round(timeoutMs / 1000)} seconds.`,
      hint: 'Check that the address is reachable from this machine and that nothing is blocking it, such as a firewall or a VPN.',
    };
  }

  const code = codeOf(error);
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return {
      detail: 'The address could not be resolved.',
      hint: 'Check the spelling of the domain and that this machine has internet access.',
    };
  }
  if (code === 'ECONNREFUSED') {
    return {
      detail: 'Nothing is listening at that address and port.',
      hint: 'Check that n8n is running and that the port is the one it serves on.',
    };
  }
  if (code !== undefined && tlsCodes.has(code)) {
    return {
      detail: 'The HTTPS certificate of the instance is not trusted.',
      hint: "The padlock of that address is not one this computer trusts. If it is your own server, install a proper certificate (a free one from Let's Encrypt works). Advanced: for a self-signed certificate, set NODE_EXTRA_CA_CERTS to your certificate file.",
    };
  }
  return {
    detail: 'The connection failed before any answer came back.',
    hint: `Check the address and your network. Technical detail: ${error instanceof Error ? error.message : 'unknown error'}.`,
  };
}

function explainStatus(status: number): { stage: 'authenticate' | 'reach'; detail: string; hint: string } {
  if (status === 401) {
    return {
      stage: 'authenticate',
      detail: 'The instance rejected the API key.',
      hint: 'In n8n open Settings, then n8n API, and create a new key. Copy it when it is shown: n8n only displays it once.',
    };
  }
  if (status === 403) {
    return {
      stage: 'authenticate',
      detail: 'The API key is valid but is not allowed to read workflows.',
      hint: 'Create a key that can read workflows and executions. GreenLight never writes, so a read-only key is enough.',
    };
  }
  if (status === 404) {
    return {
      stage: 'reach',
      detail: 'The address answered, but there is no n8n API there.',
      hint: 'Use the address you open n8n with, without /api/v1 at the end. If it is right, the n8n API may be switched off on that server: turn it on and try again.',
    };
  }
  if (status >= 300 && status < 400) {
    return {
      stage: 'reach',
      detail: 'The address redirects somewhere GreenLight will not follow.',
      hint: 'That address sends visitors somewhere else. Use the address you end up on, usually the one that starts with https.',
    };
  }
  return {
    stage: 'reach',
    detail: `The instance answered with an error (HTTP ${status}).`,
    hint: 'Try again in a moment. If it persists, check the logs of the instance.',
  };
}

function checkAddress(raw: string | undefined, allowInsecureHttp: boolean): { steps: CheckStep[]; url?: URL } {
  const value = raw?.trim();
  if (value === undefined || value === '') {
    return {
      steps: [
        step('address', 'failed', 'No address was given.', 'Use the address you open n8n with, for example https://n8n.example.com.'),
      ],
    };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {
      steps: [
        step('address', 'failed', 'That is not a valid web address.', 'Write it in full, including https://, for example https://n8n.example.com.'),
      ],
    };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      steps: [step('address', 'failed', 'The address must start with http:// or https://.', 'For example https://n8n.example.com.')],
    };
  }
  if (url.username !== '' || url.password !== '') {
    return {
      steps: [
        step('address', 'failed', 'The address contains a user name or password.', 'Remove them. The API key is asked for separately.'),
      ],
    };
  }
  if (/\/api\/v1\/?$/.test(url.pathname)) {
    return {
      steps: [
        step('address', 'failed', 'The address ends in /api/v1.', 'Use only the address of n8n, for example https://n8n.example.com. GreenLight adds the rest.'),
      ],
    };
  }

  if (url.protocol === 'http:' && !isPrivateHost(url.hostname)) {
    if (!allowInsecureHttp) {
      return { steps: [step('address', 'failed', 'The address uses http on a public host.', INSECURE_HTTP_MESSAGE)] };
    }
    return {
      url,
      steps: [step('address', 'ok', 'The address is valid.', 'Plain http was allowed on request: the API key travels unencrypted.')],
    };
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    return {
      url,
      steps: [step('address', 'ok', 'The address is valid.', 'It uses http on a private network, so the key is not encrypted. Fine if you trust that network.')],
    };
  }
  return { url, steps: [step('address', 'ok', 'The address is valid.')] };
}

/**
 * Walks from the address to reading execution history and stops at the first step that
 * fails, saying what went wrong and what to do about it. The API key is never part of
 * the result.
 */
export async function diagnose(input: DiagnoseInput): Promise<Diagnosis> {
  const timeoutMs = input.timeoutMs ?? 10_000;
  const fetchImpl = input.fetch ?? globalThis.fetch;
  const { steps, url } = checkAddress(input.baseUrl, input.allowInsecureHttp === true);
  const host = url?.host ?? null;

  const skipRest = (from: StepId[]): CheckStep[] =>
    from.map((id) => step(id, 'skipped', 'Skipped because an earlier step failed.'));

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
        step('reach', 'skipped', 'No API key was given, so the instance was not contacted.'),
        step(
          'authenticate',
          'failed',
          'No API key was given.',
          'In n8n open Settings, then n8n API, and create a key. Copy it when it is shown: n8n only displays it once.',
        ),
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
  });

  let workflowCount: number;
  try {
    workflowCount = (await client.listWorkflows()).length;
  } catch (error) {
    if (error instanceof N8nApiError) {
      const explained = explainStatus(error.status);
      const reached = step('reach', 'ok', 'The instance answered.');
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

    const explained = explainNetworkFailure(error, timeoutMs);
    return {
      ok: false,
      steps: [...steps, step('reach', 'failed', explained.detail, explained.hint), ...skipRest(['authenticate', 'executions'])],
      workflowCount: null,
      host,
    };
  }

  const reach = step('reach', 'ok', 'The instance answered.');
  const authenticate = step(
    'authenticate',
    'ok',
    `The key works and ${workflowCount} ${workflowCount === 1 ? 'workflow is' : 'workflows are'} visible.`,
  );

  try {
    await client.listExecutions({ limit: 1 });
  } catch (error) {
    const detail =
      error instanceof N8nApiError && error.status === 403
        ? 'The API key cannot read executions, and GreenLight needs them.'
        : 'Execution history could not be read.';
    return {
      ok: false,
      steps: [
        ...steps,
        reach,
        authenticate,
        step(
          'executions',
          'failed',
          detail,
          'Create a key that can read executions as well as workflows. Without history there is nothing to compare.',
        ),
      ],
      workflowCount,
      host,
    };
  }

  return {
    ok: true,
    steps: [...steps, reach, authenticate, step('executions', 'ok', 'Execution history can be read.')],
    workflowCount,
    host,
  };
}
