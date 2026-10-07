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
}

const marks = { ok: '[ok]  ', failed: '[fail]', skipped: '[skip]' } as const;

export function renderDiagnosis(diagnosis: Diagnosis): string[] {
  const lines: string[] = [];
  for (const item of diagnosis.steps) {
    lines.push(`  ${marks[item.status]} ${item.label}`);
    if (item.status !== 'skipped') {
      lines.push(`         ${item.detail}`);
    }
    if (item.hint !== undefined) {
      lines.push(`         -> ${item.hint}`);
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
  const maxAttempts = deps.maxAttempts ?? 3;
  const saved = deps.readFile(envPath) ?? '';
  const savedAddress = readEnvValue(saved, 'N8N_BASE_URL');
  const savedKey = readEnvValue(saved, 'N8N_API_KEY');

  prompter.say('GreenLight setup');
  prompter.say('');
  prompter.say('This connects GreenLight to your n8n instance. It only reads: workflows and');
  prompter.say('execution history. It never creates, changes or deletes anything.');
  prompter.say('');
  prompter.say('You need an API key. In n8n open Settings, then n8n API, and create one.');
  prompter.say('Read access is enough. Copy it when it is shown: n8n displays it only once.');
  prompter.say('');

  let address = '';
  let key = '';
  let diagnosis: Diagnosis | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    address = (
      await prompter.ask('n8n address, for example https://n8n.example.com', {
        ...(address !== '' ? { defaultValue: address } : savedAddress !== undefined ? { defaultValue: savedAddress } : {}),
      })
    ).trim();

    const earlier = attempt === 1 ? savedKey : key;
    const reuse = earlier !== undefined && earlier !== '';
    const keyQuestion = !reuse
      ? 'API key'
      : attempt === 1
        ? 'API key (press Enter to keep the saved one)'
        : 'API key (press Enter to keep the one you typed)';
    const typed = (await prompter.ask(keyQuestion, { secret: true })).trim();
    key = typed === '' && reuse ? (earlier ?? '') : typed;

    prompter.say('');
    prompter.say('Checking the connection...');
    diagnosis = await deps.diagnose({ baseUrl: address, apiKey: key });
    for (const line of renderDiagnosis(diagnosis)) {
      prompter.say(line);
    }
    prompter.say('');

    if (diagnosis.ok) {
      break;
    }
    if (attempt === maxAttempts || !(await prompter.confirm('Try again?', true))) {
      prompter.say('Nothing was saved. Run the setup again when you are ready.');
      return 1;
    }
  }

  const values: Record<string, string> = { N8N_BASE_URL: address, N8N_API_KEY: key };

  prompter.say('Optional: GreenLight can post an alert to a webhook when something new appears');
  prompter.say('(see "Watching" in the README). Paste its address, or press Enter to skip.');
  let webhook = (await prompter.ask('Alert webhook address', {})).trim();
  while (webhook !== '' && !isHttpUrl(webhook)) {
    prompter.say('That is not a valid http or https address.');
    webhook = (await prompter.ask('Alert webhook address (Enter to skip)', {})).trim();
  }
  if (webhook !== '') {
    const { protocol, hostname } = new URL(webhook);
    if (protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
      prompter.say('Note: that address uses http, so alerts and the token travel unencrypted. Prefer https.');
    }
    values['GREENLIGHT_WEBHOOK_URL'] = webhook;
    const token = (await prompter.ask('Webhook token (Enter if it has none)', { secret: true })).trim();
    if (token !== '') {
      values['GREENLIGHT_WEBHOOK_TOKEN'] = token;
    }
  }

  prompter.say('');
  if (!(await prompter.confirm(`Save these settings to ${envPath}?`, true))) {
    prompter.say('Nothing was saved.');
    return 1;
  }

  deps.writeFile(envPath, upsertEnv(saved, values));
  prompter.say(`Saved to ${envPath}. It holds your API key, so keep it private and do not commit it.`);
  prompter.say('');
  prompter.say('What next:');
  prompter.say('  Scan once and read the report   greenlight            (from a clone: npm run scan)');
  prompter.say('  Keep watching and get alerts    greenlight watch      (from a clone: npm run watch)');
  prompter.say('  Open the dashboard              npm run panel');
  prompter.say('  Check the connection again      greenlight doctor');
  return 0;
}
