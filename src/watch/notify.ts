import type { TrackedFinding } from './findings.js';

export type AlertType = 'findings' | 'scan-failing' | 'scan-recovered';

export interface AlertFinding {
  workflowId: string;
  workflowName: string;
  detector: string;
  severity: string;
  summary: string;
}

/**
 * What GreenLight posts to the webhook. `subject` and `text` are ready to drop into an
 * email or a chat message; the arrays carry the same information as data.
 */
export interface AlertPayload {
  source: 'greenlight';
  type: AlertType;
  subject: string;
  text: string;
  instance: string;
  scannedAt: string;
  newFindings: AlertFinding[];
  resolvedFindings: AlertFinding[];
}

export class WebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookError';
  }
}

function toAlertFinding(finding: TrackedFinding): AlertFinding {
  return {
    workflowId: finding.workflowId,
    workflowName: finding.workflowName,
    detector: finding.detector,
    severity: finding.severity,
    summary: finding.summary,
  };
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export interface FindingsAlertInput {
  instance: string;
  scannedAt: string;
  added: TrackedFinding[];
  resolved: TrackedFinding[];
}

export function buildFindingsAlert(input: FindingsAlertInput): AlertPayload {
  const { instance, scannedAt, added, resolved } = input;
  const critical = added.filter((finding) => finding.severity === 'critical').length;

  let subject: string;
  if (added.length > 0) {
    const kind = critical === added.length ? 'new critical finding' : 'new finding';
    subject = `GreenLight: ${plural(added.length, kind)} on ${instance}`;
  } else {
    subject = `GreenLight: ${plural(resolved.length, 'finding')} resolved on ${instance}`;
  }

  const lines = added.flatMap((finding) => [
    `${finding.severity.toUpperCase()} ${finding.workflowName} (${finding.detector})`,
    finding.summary,
    '',
  ]);
  if (resolved.length > 0) {
    lines.push('Resolved:', ...resolved.map((finding) => `- ${finding.workflowName} (${finding.detector})`));
  }

  return {
    source: 'greenlight',
    type: 'findings',
    subject,
    text: lines.join('\n').trim(),
    instance,
    scannedAt,
    newFindings: added.map(toAlertFinding),
    resolvedFindings: resolved.map(toAlertFinding),
  };
}

export function buildFailureAlert(instance: string, at: string, failures: number): AlertPayload {
  return {
    source: 'greenlight',
    type: 'scan-failing',
    subject: `GreenLight cannot scan ${instance}`,
    text: `The last ${plural(failures, 'scan')} failed, so nothing is being checked. Verify that the instance is reachable and that the API key is still valid.`,
    instance,
    scannedAt: at,
    newFindings: [],
    resolvedFindings: [],
  };
}

export function buildRecoveryAlert(instance: string, at: string): AlertPayload {
  return {
    source: 'greenlight',
    type: 'scan-recovered',
    subject: `GreenLight is scanning ${instance} again`,
    text: 'The instance answered and scanning has resumed.',
    instance,
    scannedAt: at,
    newFindings: [],
    resolvedFindings: [],
  };
}

export interface DeliverOptions {
  url: string;
  token: string | null;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

/**
 * Errors never include the URL: for chat and email services the URL is itself the secret.
 */
export async function deliverAlert(payload: AlertPayload, options: DeliverOptions): Promise<void> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.token !== null) {
    headers['authorization'] = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetchImpl(options.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      // A redirect would carry the alert text and the token to wherever it points.
      redirect: 'error',
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    throw new WebhookError(`Could not reach the webhook: ${reason}`);
  }

  if (!response.ok) {
    throw new WebhookError(`The webhook answered HTTP ${response.status}.`);
  }
}
