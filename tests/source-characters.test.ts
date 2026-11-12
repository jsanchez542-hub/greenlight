import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A character that cannot be seen makes a file say one thing to whoever reads it and another to
 * the program. It has happened here: a `\b` saved as a backspace kept two rules of a test from
 * ever matching, and nobody could tell by looking. A test that needs such a character builds it
 * from its number.
 */
const UNSEEN: ReadonlyArray<readonly [first: number, last: number, what: string]> = [
  [0x0000, 0x0008, 'a control character'],
  [0x000b, 0x000c, 'a control character'],
  [0x000e, 0x001f, 'a control character'],
  [0x007f, 0x009f, 'a control character'],
  [0x00ad, 0x00ad, 'a soft hyphen'],
  [0x061c, 0x061c, 'a direction mark'],
  [0x200b, 0x200f, 'a zero width character or a direction mark'],
  [0x2028, 0x202e, 'a line separator or a direction override'],
  [0x2060, 0x2069, 'an invisible operator or a direction isolate'],
  [0xfeff, 0xfeff, 'a byte order mark'],
];

const NOT_TEXT = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|mp4|webm|pdf|zip|tgz)$/i;

function unseenIn(text: string): string[] {
  const found: string[] = [];
  text.split('\n').forEach((line, index) => {
    for (let at = 0; at < line.length; at += 1) {
      const code = line.charCodeAt(at);
      const kind = UNSEEN.find(([first, last]) => code >= first && code <= last);
      if (kind !== undefined) {
        found.push(`line ${index + 1}: ${kind[2]} (U+${code.toString(16).toUpperCase().padStart(4, '0')})`);
      }
    }
  });
  return found;
}

describe('the files of the repository', () => {
  it.skipIf(!existsSync('.git'))('hold no character that cannot be seen', () => {
    const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter((file) => file !== '' && !NOT_TEXT.test(file) && existsSync(file));

    const problems = tracked.flatMap((file) => unseenIn(readFileSync(file, 'utf8')).map((problem) => `${file}, ${problem}`));

    expect(tracked.length).toBeGreaterThan(100);
    expect(problems).toEqual([]);
  });

  it('are checked by a test that does tell such a character from ordinary text', () => {
    const char = (code: number): string => String.fromCharCode(code);

    expect(unseenIn(`plain text, with a tab\tand an accent: señal`)).toEqual([]);
    expect(unseenIn(`first line\nsecond${char(0x08)} line`)).toEqual(['line 2: a control character (U+0008)']);
    expect(unseenIn(`${char(0x202e)}reversed`)).toEqual(['line 1: a line separator or a direction override (U+202E)']);
    expect(unseenIn(`zero${char(0x200b)}width`)).toEqual(['line 1: a zero width character or a direction mark (U+200B)']);
  });
});
