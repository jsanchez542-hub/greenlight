import { describe, expect, it } from 'vitest';
import type { Diagnosis } from '../../src/setup/diagnose.js';
import { diagnose } from '../../src/setup/diagnose.js';
import { renderDiagnosis, runInit, type Prompter } from '../../src/setup/init.js';

const KEY = 'n8n_api_secret_value';

interface Script {
  answers: string[];
  confirms?: boolean[];
}

function session(script: Script, existing: string | null = null, accepts: (key: string) => boolean = () => true) {
  const said: string[] = [];
  const asked: { question: string; secret: boolean; defaultValue: string | undefined }[] = [];
  const written: { path: string; text: string }[] = [];
  const answers = [...script.answers];
  const confirms = [...(script.confirms ?? [])];

  const prompter: Prompter = {
    async ask(question, options = {}) {
      asked.push({ question, secret: options.secret === true, defaultValue: options.defaultValue });
      const answer = answers.shift();
      if (answer === undefined) {
        throw new Error(`Unexpected question: ${question}`);
      }
      return answer === '' && options.defaultValue !== undefined ? options.defaultValue : answer;
    },
    async confirm() {
      return confirms.shift() ?? true;
    },
    say: (line) => void said.push(line),
  };

  const fakeDiagnose: typeof diagnose = async ({ baseUrl, apiKey }) => {
    const ok = apiKey !== undefined && accepts(apiKey) && !(baseUrl ?? '').endsWith('/api/v1');
    const result: Diagnosis = {
      ok,
      host: baseUrl === undefined ? null : new URL(baseUrl).host,
      workflowCount: ok ? 23 : null,
      steps: [
        { id: 'address', label: 'The address looks valid', status: 'ok', detail: 'The address is valid.' },
        ok
          ? { id: 'authenticate', label: 'The API key is accepted', status: 'ok', detail: 'The key works.' }
          : {
              id: 'authenticate',
              label: 'The API key is accepted',
              status: 'failed',
              detail: 'The instance rejected the API key.',
              hint: 'Create a new key.',
            },
      ],
    };
    return result;
  };

  const deps = {
    prompter,
    diagnose: fakeDiagnose,
    envPath: '.env',
    readFile: () => existing,
    writeFile: (path: string, text: string) => void written.push({ path, text }),
  };
  return { deps, said, asked, written };
}

describe('runInit', () => {
  it('walks a first-time user from nothing to a saved file', async () => {
    const { deps, written, said } = session({ answers: ['https://n8n.example.com', KEY, ''] });

    const code = await runInit(deps);

    expect(code).toBe(0);
    expect(written).toHaveLength(1);
    expect(written[0]?.text).toBe(`N8N_BASE_URL=https://n8n.example.com\nN8N_API_KEY=${KEY}\n`);
    expect(said.join('\n')).toContain('greenlight watch');
  });

  it('asks for the key without echo and never prints it', async () => {
    const { deps, asked, said } = session({ answers: ['https://n8n.example.com', KEY, ''] });

    await runInit(deps);

    expect(asked.find((entry) => entry.question.startsWith('API key'))?.secret).toBe(true);
    expect(said.join('\n')).not.toContain(KEY);
  });

  it('explains how to get a key before asking for it', async () => {
    const { deps, said } = session({ answers: ['https://n8n.example.com', KEY, ''] });

    await runInit(deps);

    expect(said.join('\n')).toContain('Settings, then n8n API');
    expect(said.join('\n')).toContain('only reads');
  });

  it('lets the user correct a wrong key and keeps the address they typed', async () => {
    const { deps, asked, written } = session(
      { answers: ['https://n8n.example.com', 'wrong', '', 'good-key', ''] },
      null,
      (key) => key === 'good-key',
    );

    const code = await runInit(deps);

    expect(code).toBe(0);
    expect(asked.filter((entry) => entry.question.startsWith('n8n address'))[1]?.defaultValue).toBe(
      'https://n8n.example.com',
    );
    expect(written[0]?.text).toContain('N8N_API_KEY=good-key');
  });

  it('keeps the key that was typed when only the address needed fixing', async () => {
    const { deps, asked, written } = session({
      answers: ['https://n8n.example.com/api/v1', KEY, 'https://n8n.example.com', '', ''],
    });

    const code = await runInit(deps);

    expect(code).toBe(0);
    expect(asked.filter((entry) => entry.question.startsWith('API key'))[1]?.question).toContain('keep the one you typed');
    expect(written[0]?.text).toContain(`N8N_API_KEY=${KEY}`);
    expect(written[0]?.text).toContain('N8N_BASE_URL=https://n8n.example.com\n');
  });

  it('saves nothing after the last failed attempt', async () => {
    const { deps, written, said } = session(
      { answers: ['https://n8n.example.com', 'a', 'https://n8n.example.com', 'b'], confirms: [true] },
      null,
      () => false,
    );

    const code = await runInit({ ...deps, maxAttempts: 2 });

    expect(code).toBe(1);
    expect(written).toEqual([]);
    expect(said.join('\n')).toContain('Nothing was saved');
  });

  it('stops when the user does not want to try again', async () => {
    const { deps, written } = session({ answers: ['https://n8n.example.com', 'a'], confirms: [false] }, null, () => false);

    expect(await runInit(deps)).toBe(1);
    expect(written).toEqual([]);
  });

  it('keeps the saved key when the user just presses Enter', async () => {
    const existing = `N8N_BASE_URL=https://n8n.example.com\nN8N_API_KEY=${KEY}\n`;
    const { deps, asked, written } = session({ answers: ['', '', ''] }, existing);

    await runInit(deps);

    expect(asked[0]?.defaultValue).toBe('https://n8n.example.com');
    expect(written[0]?.text).toContain(`N8N_API_KEY=${KEY}`);
  });

  it('keeps the rest of an existing file', async () => {
    const existing = '# my settings\nFOO=bar\n';
    const { deps, written } = session({ answers: ['https://n8n.example.com', KEY, ''] }, existing);

    await runInit(deps);

    expect(written[0]?.text.startsWith('# my settings\nFOO=bar\n')).toBe(true);
  });

  it('stores an alert webhook and its token when given', async () => {
    const { deps, written } = session({
      answers: ['https://n8n.example.com', KEY, 'https://hooks.example.com/abc', 'tok'],
    });

    await runInit(deps);

    expect(written[0]?.text).toContain('GREENLIGHT_WEBHOOK_URL=https://hooks.example.com/abc');
    expect(written[0]?.text).toContain('GREENLIGHT_WEBHOOK_TOKEN=tok');
  });

  it('asks again when the webhook is not an address', async () => {
    const { deps, said, written } = session({ answers: ['https://n8n.example.com', KEY, 'not a url', ''] });

    await runInit(deps);

    expect(said.join('\n')).toContain('not a valid http or https address');
    expect(written[0]?.text).not.toContain('GREENLIGHT_WEBHOOK_URL');
  });

  it('writes nothing if the user declines at the end', async () => {
    const { deps, written } = session({ answers: ['https://n8n.example.com', KEY, ''], confirms: [false] });

    expect(await runInit(deps)).toBe(1);
    expect(written).toEqual([]);
  });
});

describe('renderDiagnosis', () => {
  it('marks each step and shows the hint under a failure', () => {
    const lines = renderDiagnosis({
      ok: false,
      host: 'n8n.example.com',
      workflowCount: null,
      steps: [
        { id: 'address', label: 'The address looks valid', status: 'ok', detail: 'The address is valid.' },
        { id: 'authenticate', label: 'The API key is accepted', status: 'failed', detail: 'Rejected.', hint: 'Make a new key.' },
        { id: 'executions', label: 'Execution history is readable', status: 'skipped', detail: 'Skipped.' },
      ],
    });

    expect(lines.join('\n')).toContain('[ok]   The address looks valid');
    expect(lines.join('\n')).toContain('[fail] The API key is accepted');
    expect(lines.join('\n')).toContain('-> Make a new key.');
    expect(lines.join('\n')).toContain('[skip] Execution history is readable');
    expect(lines.join('\n')).not.toContain('Skipped.');
  });
});
