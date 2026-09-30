import { PassThrough, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { SetupCancelled, createTerminalPrompter } from '../../src/setup/prompter.js';

function terminal() {
  const input = new PassThrough();
  const chunks: string[] = [];
  const output = Object.assign(
    new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    }),
    { isTTY: true },
  );
  return { input, output, shown: () => chunks.join('') };
}

describe('createTerminalPrompter', () => {
  it('does not echo a secret while it is typed', async () => {
    const { input, output, shown } = terminal();
    const prompter = createTerminalPrompter(input, output);

    const answer = prompter.ask('API key', { secret: true });
    input.write('topsecretvalue\n');

    expect(await answer).toBe('topsecretvalue');
    expect(shown()).toContain('API key');
    expect(shown()).not.toContain('topsecretvalue');
    prompter.close();
  });

  it('does echo an ordinary answer, so the user can see what they typed', async () => {
    const { input, output, shown } = terminal();
    const prompter = createTerminalPrompter(input, output);

    const answer = prompter.ask('Address');
    input.write('https://n8n.example.com\n');

    expect(await answer).toBe('https://n8n.example.com');
    expect(shown()).toContain('https://n8n.example.com');
    prompter.close();
  });

  it('shows the default in brackets and uses it on an empty answer', async () => {
    const { input, output, shown } = terminal();
    const prompter = createTerminalPrompter(input, output);

    const answer = prompter.ask('Address', { defaultValue: 'https://saved.example.com' });
    input.write('\n');

    expect(await answer).toBe('https://saved.example.com');
    expect(shown()).toContain('[https://saved.example.com]');
    prompter.close();
  });

  it('understands yes, no and the default for confirmations', async () => {
    const { input, output } = terminal();
    const prompter = createTerminalPrompter(input, output);

    const first = prompter.confirm('Go on?', true);
    input.write('n\n');
    const second = prompter.confirm('Go on?', false);
    input.write('YES\n');
    const third = prompter.confirm('Go on?', true);
    input.write('\n');

    expect([await first, await second, await third]).toEqual([false, true, true]);
    prompter.close();
  });

  it('keeps answers that arrive together, as when they are pasted or piped', async () => {
    const { input, output } = terminal();
    const prompter = createTerminalPrompter(input, output);

    input.write('first\nsecond\nthird\n');
    input.end();

    expect(await prompter.ask('One')).toBe('first');
    expect(await prompter.ask('Two', { secret: true })).toBe('second');
    expect(await prompter.confirm('Three', false)).toBe(false);
    await expect(prompter.ask('Four')).rejects.toBeInstanceOf(SetupCancelled);
  });

  it('stops with a clear error when the input ends before the questions do', async () => {
    const { input, output } = terminal();
    const prompter = createTerminalPrompter(input, output);

    const answer = prompter.ask('Address');
    input.end();

    await expect(answer).rejects.toBeInstanceOf(SetupCancelled);
  });
});
