import { messagesFor, type Lang } from '../i18n/index.js';
import type { diagnose as diagnoseFunction, Diagnosis } from './diagnose.js';
import { readEnvValue, upsertEnv } from './env-file.js';

export interface Prompter {
  ask(question: string, options?: { secret?: boolean; defaultValue?: string }): Promise<string>;
  confirm(question: string, defaultYes: boolean): Promise<boolean>;
  say(line: string): void;
}

export interface InitDependencies {
  prompter: Prompter;
  diagnose: typeof diagnoseFunction;
  /** Returns null when the file does not exist. */
  readFile(path: string): string | null;
  writeFile(path: string, text: string): void;
  envPath: string;
  maxAttempts?: number;
  lang?: Lang;
}

export function renderDiagnosis(diagnosis: Diagnosis, lang: Lang = 'en'): string[] {
  const marks = messagesFor(lang).init.marks;
  const lines: string[] = [];
  // The details line up under the label whatever the width of the mark in this language.
  const indent = ' '.repeat(3 + marks.ok.length);
  for (const item of diagnosis.steps) {
    lines.push(`  ${marks[item.status]} ${item.label}`);
    if (item.status !== 'skipped') {
      lines.push(`${indent}${item.detail}`);
    }
    if (item.hint !== undefined) {
      lines.push(`${indent}-> ${item.hint}`);
    }
  }
  return lines;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Guides a first-time user from nothing to a working .env file. Returns the exit code.
 * The key is never echoed and never printed.
 */
export async function runInit(deps: InitDependencies): Promise<number> {
  const { prompter, envPath } = deps;
  const lang = deps.lang ?? 'en';
  const t = messagesFor(lang).init;
  const maxAttempts = deps.maxAttempts ?? 3;
  const saved = deps.readFile(envPath) ?? '';
  const savedAddress = readEnvValue(saved, 'N8N_BASE_URL');
  const savedKey = readEnvValue(saved, 'N8N_API_KEY');

  prompter.say(t.title);
  prompter.say('');
  for (const line of t.intro) {
    prompter.say(line);
  }

  let address = '';
  let key = '';
  let diagnosis: Diagnosis | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    address = (
      await prompter.ask(t.askAddress, {
        ...(address !== '' ? { defaultValue: address } : savedAddress !== undefined ? { defaultValue: savedAddress } : {}),
      })
    ).trim();

    const earlier = attempt === 1 ? savedKey : key;
    const reuse = earlier !== undefined && earlier !== '';
    const keyQuestion = !reuse ? t.askKey : attempt === 1 ? t.askKeySaved : t.askKeyTyped;
    const typed = (await prompter.ask(keyQuestion, { secret: true })).trim();
    key = typed === '' && reuse ? (earlier ?? '') : typed;

    prompter.say('');
    prompter.say(t.checking);
    diagnosis = await deps.diagnose({ baseUrl: address, apiKey: key, lang });
    for (const line of renderDiagnosis(diagnosis, lang)) {
      prompter.say(line);
    }
    prompter.say('');

    if (diagnosis.ok) {
      break;
    }
    if (attempt === maxAttempts || !(await prompter.confirm(t.tryAgain, true))) {
      prompter.say(t.notSavedRetry);
      return 1;
    }
  }

  const values: Record<string, string> = { N8N_BASE_URL: address, N8N_API_KEY: key };

  for (const line of t.webhookIntro) {
    prompter.say(line);
  }
  let webhook = (await prompter.ask(t.askWebhook, {})).trim();
  while (webhook !== '' && !isHttpUrl(webhook)) {
    prompter.say(t.badWebhook);
    webhook = (await prompter.ask(t.askWebhookAgain, {})).trim();
  }
  if (webhook !== '') {
    const { protocol, hostname } = new URL(webhook);
    if (protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
      prompter.say(t.webhookHttp);
    }
    values['GREENLIGHT_WEBHOOK_URL'] = webhook;
    const token = (await prompter.ask(t.askToken, { secret: true })).trim();
    if (token !== '') {
      values['GREENLIGHT_WEBHOOK_TOKEN'] = token;
    }
  }

  prompter.say('');
  for (const line of t.updatesIntro) {
    prompter.say(line);
  }
  values['GREENLIGHT_CHECK_UPDATES'] = (await prompter.confirm(t.askUpdates, true)) ? '1' : '0';

  prompter.say('');
  if (!(await prompter.confirm(t.confirmSave(envPath), true))) {
    prompter.say(t.notSaved);
    return 1;
  }

  deps.writeFile(envPath, upsertEnv(saved, values));
  prompter.say(t.saved(envPath));
  prompter.say('');
  for (const line of t.next) {
    prompter.say(line);
  }
  return 0;
}
