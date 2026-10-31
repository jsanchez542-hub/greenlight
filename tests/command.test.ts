import { describe, expect, it } from 'vitest';
import { commandName } from '../src/command.js';
import { loadConfig } from '../src/config.js';
import { messagesFor, type Lang } from '../src/i18n/index.js';

const NPX = 'npx greenlight-n8n';

describe('commandName', () => {
  it('is the installed command unless the program was started through npx', () => {
    expect(commandName({})).toBe('greenlight');
    expect(commandName({ npm_command: 'run-script' })).toBe('greenlight');
    expect(commandName({ npm_command: 'exec' })).toBe(NPX);
  });
});

describe.each(['en', 'es'] as const satisfies readonly Lang[])('the messages that name a command, in %s', (lang) => {
  const t = messagesFor(lang);

  it('tell a person who started it with npx to type what they can type', () => {
    expect(() => loadConfig({ npm_command: 'exec' }, lang)).toThrow(`${NPX} init`);
    expect(t.cli.doctorFix(NPX)).toContain(`${NPX} init`);
    expect(t.cli.usage(NPX)).toContain(`${NPX} watch [--once]`);
    expect(t.init.next(NPX).join('\n')).toContain(`${NPX} doctor`);
  });

  it('keep saying greenlight for the installed command', () => {
    expect(() => loadConfig({}, lang)).toThrow('greenlight init');
    expect(t.init.next('greenlight').join('\n')).toContain('greenlight watch');
  });

  it('never send a person who used npx to a command they do not have', () => {
    const steps = t.init.next(NPX).join('\n');

    expect(steps).not.toMatch(/(^|\s)greenlight( |$)/m);
    expect(t.cli.usage(NPX)).not.toMatch(/^ {2}greenlight /m);
  });

  it('line up the descriptions of the help whatever the command is', () => {
    for (const command of ['greenlight', NPX]) {
      const rows = t.cli
        .usage(command)
        .split('\n')
        .filter((line) => line.startsWith(`  ${command} `));

      expect(rows).toHaveLength(5);
      for (const row of rows) {
        expect(row.slice(0, 38)).toMatch(/ $/);
        expect(row[38]).not.toBe(' ');
      }
    }
  });
});
