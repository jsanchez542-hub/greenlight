import { describeFinding, messagesFor, type Lang } from '../i18n/index.js';
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
 * email or a chat message; the arrays carry the same information as data. `lang` says which
 * language those sentences are written in.
 */
export interface AlertPayload {
  source: 'greenlight';
  type: AlertType;
  lang: Lang;
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

function toAlertFinding(finding: TrackedFinding, lang: Lang): AlertFinding {
  return {
    workflowId: finding.workflowId,
    workflowName: finding.workflowName,
    detector: finding.detector,
    severity: finding.severity,
    summary: describeFinding({ ...finding, evidence: finding.evidence ?? {} }, lang),
  };
}

export interface FindingsAlertInput {
  instance: string;
  scannedAt: string;
  added: TrackedFinding[];
  resolved: TrackedFinding[];
  lang?: Lang;
}

export function buildFindingsAlert(input: FindingsAlertInput): AlertPayload {
  const { instance, scannedAt, added, resolved } = input;
  const lang = input.lang ?? 'en';
  const t = messagesFor(lang).alert;
  const critical = added.filter((finding) => finding.severity === 'critical').length;

  const subject =
    added.length > 0
      ? t.newFindings(added.length, critical, instance)
      : t.resolvedFindings(resolved.length, instance);

  const newFindings = added.map((finding) => toAlertFinding(finding, lang));
  const lines = added.flatMap((finding, index) => [
    `${t.severity[finding.severity]} ${finding.workflowName} (${finding.detector})`,
    newFindings[index]?.summary ?? finding.summary,
    '',
  ]);
  if (resolved.length > 0) {
    lines.push(t.resolvedHeading, ...resolved.map((finding) => `- ${finding.workflowName} (${finding.detector})`));
  }

  return {
    source: 'greenlight',
    type: 'findings',
    lang,
    subject,
    text: lines.join('\n').trim(),
    instance,
    scannedAt,
    newFindings,
    resolvedFindings: resolved.map((finding) => toAlertFinding(finding, lang)),
  };
}

export function buildFailureAlert(instance: string, at: string, failures: number, lang: Lang = 'en'): AlertPayload {
  const t = messagesFor(lang).alert;
  return {
    source: 'greenlight',
    type: 'scan-failing',
    lang,
    subject: t.failingSubject(instance),
    text: t.failingText(failures),
    instance,
    scannedAt: at,
    newFindings: [],
    resolvedFindings: [],
  };
}

export function buildRecoveryAlert(instance: string, at: string, lang: Lang = 'en'): AlertPayload {
  const t = messagesFor(lang).alert;
  return {
    source: 'greenlight',
    type: 'scan-recovered',
    lang,
    subject: t.recoveredSubject(instance),
    text: t.recoveredText,
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
  lang?: Lang;
}

/**
 * Errors never include the URL: for chat and email services the URL is itself the secret.
 */
export async function deliverAlert(payload: AlertPayload, options: DeliverOptions): Promise<void> {
  const t = messagesFor(options.lang ?? 'en');
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
    const reason = error instanceof Error ? error.message : t.cli.unknownError;
    throw new WebhookError(t.alert.webhookUnreachable(reason));
  }

  if (!response.ok) {
    throw new WebhookError(t.alert.webhookStatus(response.status));
  }
}
