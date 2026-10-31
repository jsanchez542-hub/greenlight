import { describe, expect, it } from 'vitest';
import { quoteForWindows, spawnCommandSync } from '../scripts/spawn.mjs';

describe('quoteForWindows', () => {
  it.each([
    ['install', 'install'],
    ['--no-audit', '--no-audit'],
    ['greenlight-n8n@latest', 'greenlight-n8n@latest'],
    ['C:\\Users\\someone\\package.tgz', 'C:\\Users\\someone\\package.tgz'],
    ['./folder/file.tgz', './folder/file.tgz'],
  ])('leaves %s as it is', (argument, expected) => {
    expect(quoteForWindows(argument)).toBe(expected);
  });

  it.each([
    ['C:\\Program Files\\x.tgz', '"C:\\Program Files\\x.tgz"'],
    ['two words', '"two words"'],
    ['say "hi"', '"say \\"hi\\""'],
    ['', '""'],
    ['a&b', '"a&b"'],
    ['a|b', '"a|b"'],
  ])('quotes %j', (argument, expected) => {
    expect(quoteForWindows(argument)).toBe(expected);
  });
});

describe('spawnCommandSync', () => {
  it('runs a program and hands each argument over as it was written, spaces and quotes included', () => {
    const awkward = 'one "two" three';
    const result = spawnCommandSync(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', awkward], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(awkward);
  });
});
