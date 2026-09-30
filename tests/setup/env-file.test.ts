import { describe, expect, it } from 'vitest';
import { quoteEnvValue, readEnvValue, upsertEnv } from '../../src/setup/env-file.js';

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
