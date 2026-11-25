import { describe, expect, it } from 'vitest';
import { revealControls } from '../src/untrusted-text.js';

// The characters are built from their numbers so that this file holds none of them: one that
// cannot be seen has no place in source code.
const char = (code: number): string => String.fromCharCode(code);

describe('revealControls', () => {
  it('leaves ordinary text as it is, in any script', () => {
    const arabic = [0x62a, 0x623, 0x643, 0x64a, 0x62f].map(char).join('');
    const japanese = [0x6ce8, 0x6587, 0x306e, 0x78ba, 0x8a8d].map(char).join('');

    for (const text of ['Order confirmations', 'Envío de facturas n.º 3', arabic, japanese, 'Reports (weekly) 100 %', '']) {
      expect(revealControls(text)).toBe(text);
    }
  });

  it.each([
    ['escape, which starts the sequences a terminal obeys', 0x1b, '\\x1B'],
    ['the bell', 0x07, '\\x07'],
    ['a carriage return, which sends the cursor back over the line', 0x0d, '\\x0D'],
    ['a line feed', 0x0a, '\\x0A'],
    ['a tab', 0x09, '\\x09'],
    ['the null character', 0x00, '\\x00'],
    ['delete', 0x7f, '\\x7F'],
    ['the single character that stands for escape and a bracket', 0x9b, '\\x9B'],
    ['next line', 0x85, '\\x85'],
    ['a line separator', 0x2028, '\\u{2028}'],
    ['a paragraph separator', 0x2029, '\\u{2029}'],
    ['a left-to-right embedding', 0x202a, '\\u{202A}'],
    ['the end of an embedding', 0x202c, '\\u{202C}'],
    ['a right-to-left override', 0x202e, '\\u{202E}'],
    ['the first isolate', 0x2066, '\\u{2066}'],
    ['the end of an isolate', 0x2069, '\\u{2069}'],
    ['a left-to-right mark', 0x200e, '\\u{200E}'],
    ['a right-to-left mark', 0x200f, '\\u{200F}'],
    ['an Arabic letter mark', 0x61c, '\\u{61C}'],
  ])('spells out %s', (_what, code, shown) => {
    expect(revealControls(`before${char(code)}after`)).toBe(`before${shown}after`);
  });

  it('spells out every one of them in a name, and nothing else', () => {
    const name = `Daily${char(0x1b)}[2K digest${char(0x202e)} n.º 3`;

    expect(revealControls(name)).toBe('Daily\\x1B[2K digest\\u{202E} n.º 3');
  });

  it('leaves nothing that a terminal or a reader would act on', () => {
    const unseen: Array<[number, number]> = [
      [0x00, 0x1f],
      [0x7f, 0x9f],
      [0x61c, 0x61c],
      [0x200e, 0x200f],
      [0x2028, 0x202e],
      [0x2066, 0x2069],
    ];
    const everything = Array.from({ length: 0x2100 }, (_, code) => char(code)).join('');

    const left = [...revealControls(everything)].filter((character) =>
      unseen.some(([from, to]) => character.charCodeAt(0) >= from && character.charCodeAt(0) <= to),
    );

    expect(left).toEqual([]);
  });
});
