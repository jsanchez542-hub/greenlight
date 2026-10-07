import { describe, expect, it } from 'vitest';
import { quoteEnvValue, readEnvValue, removeEnvKeys, upsertEnv } from '../../src/setup/env-file.js';

describe('quoteEnvValue', () => {
  it('leaves an ordinary address and a key untouched', () => {
    expect(quoteEnvValue('https://n8n.example.com/path')).toBe('https://n8n.example.com/path');
    expect(quoteEnvValue('eyJhbGciOi.abc-123_XYZ')).toBe('eyJhbGciOi.abc-123_XYZ');
  });

  it('quotes anything a parser could misread', () => {
    expect(quoteEnvValue('has space')).toBe('"has space"');
    expect(quoteEnvValue('a#b')).toBe('"a#b"');
    expect(quoteEnvValue('say "hi"')).toBe('"say \\"hi\\""');
  });
});

describe('upsertEnv', () => {
  it('creates the file content from nothing', () => {
    expect(upsertEnv('', { N8N_BASE_URL: 'https://n8n.example.com', N8N_API_KEY: 'k' })).toBe(
      'N8N_BASE_URL=https://n8n.example.com\nN8N_API_KEY=k\n',
    );
  });

  it('replaces a key in place and keeps every other line, comments included', () => {
    const before = '# my notes\nOTHER=1\nN8N_API_KEY=old\n\n# end\n';

    const after = upsertEnv(before, { N8N_API_KEY: 'new' });

    expect(after).toBe('# my notes\nOTHER=1\nN8N_API_KEY=new\n\n# end\n');
  });

  it('recognises the export form and spaces around the equals sign', () => {
    expect(upsertEnv('export N8N_API_KEY = old\n', { N8N_API_KEY: 'new' })).toBe('N8N_API_KEY=new\n');
  });

  it('appends keys that are not there yet', () => {
    expect(upsertEnv('OTHER=1\n', { N8N_API_KEY: 'k' })).toBe('OTHER=1\nN8N_API_KEY=k\n');
  });

  it('does not mistake a key that only starts with the same letters', () => {
    expect(upsertEnv('N8N_API_KEY_BACKUP=x\n', { N8N_API_KEY: 'k' })).toBe('N8N_API_KEY_BACKUP=x\nN8N_API_KEY=k\n');
  });

  it('copes with Windows line endings', () => {
    expect(upsertEnv('A=1\r\nB=2\r\n', { B: '3' })).toBe('A=1\nB=3\n');
  });
});

describe('readEnvValue', () => {
  it('reads back what was written, quotes included', () => {
    const text = upsertEnv('', { A: 'plain', B: 'has "quotes" and #hash' });

    expect(readEnvValue(text, 'A')).toBe('plain');
    expect(readEnvValue(text, 'B')).toBe('has "quotes" and #hash');
  });

  it('returns nothing for a key that is absent', () => {
    expect(readEnvValue('A=1\n', 'B')).toBeUndefined();
  });
});

describe('what a value may not do', () => {
  it('refuses a value that tries to smuggle in another setting with a line break', () => {
    const attack = 'real-key\nGREENLIGHT_WEBHOOK_URL=https://attacker.example.net/collect';

    expect(() => upsertEnv('', { N8N_API_KEY: attack })).toThrow('control character');
  });

  it('refuses every control character, not only the line break', () => {
    for (const bad of ['a\rb', 'a\0b', 'a\u001bb', 'a\u007fb']) {
      expect(() => upsertEnv('', { N8N_API_KEY: bad }), JSON.stringify(bad)).toThrow();
    }
  });

  it('refuses a setting name that is not a plain variable name', () => {
    for (const bad of ['n8n_key', 'A B', 'A=B', 'A\nB', '', 'KEY.*', '(a|b)']) {
      expect(() => upsertEnv('', { [bad]: 'x' }), JSON.stringify(bad)).toThrow('setting name');
    }
  });

  it('leaves the file untouched when it refuses', () => {
    const before = 'KEEP=1\n';

    expect(() => upsertEnv(before, { N8N_API_KEY: 'a\nb' })).toThrow();
    expect(before).toBe('KEEP=1\n');
  });

  it('still accepts a realistic key, quotes included', () => {
    expect(upsertEnv('', { N8N_API_KEY: 'eyJhbGciOi.eyJzdWIi-1_2.sig=' })).toBe('N8N_API_KEY=eyJhbGciOi.eyJzdWIi-1_2.sig=\n');
  });
});

describe('removeEnvKeys', () => {
  it('removes only the named settings and keeps comments and the rest', () => {
    const before = '# mine\nOTHER=1\nN8N_BASE_URL=https://n8n.example.com\nexport N8N_API_KEY = k\nLAST=2\n';

    expect(removeEnvKeys(before, ['N8N_BASE_URL', 'N8N_API_KEY'])).toBe('# mine\nOTHER=1\nLAST=2\n');
  });

  it('does not touch a setting whose name merely starts the same way', () => {
    expect(removeEnvKeys('N8N_API_KEY_BACKUP=x\nN8N_API_KEY=k\n', ['N8N_API_KEY'])).toBe('N8N_API_KEY_BACKUP=x\n');
  });

  it('returns an empty file when nothing is left', () => {
    expect(removeEnvKeys('N8N_API_KEY=k\n', ['N8N_API_KEY'])).toBe('');
  });

  it('does nothing when the setting is not there', () => {
    expect(removeEnvKeys('A=1\n', ['N8N_API_KEY'])).toBe('A=1\n');
  });

  it('refuses a name that is not a plain variable name', () => {
    expect(() => removeEnvKeys('A=1\n', ['.*'])).toThrow('setting name');
  });
});
