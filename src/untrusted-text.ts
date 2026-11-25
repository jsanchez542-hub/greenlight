/**
 * The names of workflows and nodes are written by whoever can edit the instance, and they end up
 * in a terminal, in a log and in the text of an alert. A control character among them can move
 * the cursor, wipe a line or turn round the reading order of what follows, and make a report say
 * something it does not. Wherever such text is written for a person, each of those characters is
 * spelled out as the escape a programmer would type for it, so a name stays one piece of visible
 * text on its line.
 *
 * The ranges are given as numbers and not as a regular expression so that this file holds none
 * of the characters it is about.
 */
const UNSEEN: ReadonlyArray<readonly [first: number, last: number]> = [
  [0x0000, 0x001f], // C0 controls: escape, bell, tab, line feed, carriage return...
  [0x007f, 0x009f], // delete and the C1 controls
  [0x061c, 0x061c], // Arabic letter mark
  [0x200e, 0x200f], // left-to-right and right-to-left marks
  [0x2028, 0x202e], // line and paragraph separators, embeddings and overrides
  [0x2066, 0x2069], // isolates
];

function spelledOut(code: number): string {
  const hex = code.toString(16).toUpperCase();
  return code <= 0xff ? `\\x${hex.padStart(2, '0')}` : `\\u{${hex}}`;
}

export function revealControls(text: string): string {
  let shown = '';
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    shown += UNSEEN.some(([first, last]) => code >= first && code <= last) ? spelledOut(code) : text.charAt(index);
  }
  return shown;
}
