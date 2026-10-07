export class EnvValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValueError';
  }
}

/** Line breaks and other control characters would let a value smuggle in lines of its own. */
export function hasControlCharacters(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value);
}

const KEY_NAME = /^[A-Z][A-Z0-9_]*$/;

/**
 * Values are written as they are unless they would be misread by a dotenv parser, in which
 * case they are double quoted.
 */
export function quoteEnvValue(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]*$/.test(value)) {
    return value;
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function keyPattern(key: string): RegExp {
  return new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`);
}

function linesOf(text: string): string[] {
  const lines = text === '' ? [] : text.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') {
    lines.pop();
  }
  return lines;
}

/**
 * Sets the given keys in the text of a .env file. Existing lines for those keys are
 * replaced in place, new keys are appended, and every other line, including comments,
 * is left exactly as it was. A key that is not a plain variable name, or a value with a
 * control character, is refused rather than written.
 */
export function upsertEnv(existing: string, values: Record<string, string>): string {
  const lines = linesOf(existing);

  for (const [key, value] of Object.entries(values)) {
    if (!KEY_NAME.test(key)) {
      throw new EnvValueError('A setting name may only contain capital letters, digits and underscores.');
    }
    if (hasControlCharacters(value)) {
      throw new EnvValueError(`The value for ${key} contains a line break or another control character.`);
    }

    const line = `${key}=${quoteEnvValue(value)}`;
    const index = lines.findIndex((candidate) => keyPattern(key).test(candidate));
    if (index === -1) {
      lines.push(line);
    } else {
      lines[index] = line;
    }
  }

  return `${lines.join('\n')}\n`;
}

/** Removes the lines that set the given keys and leaves every other line as it was. */
export function removeEnvKeys(existing: string, keys: string[]): string {
  for (const key of keys) {
    if (!KEY_NAME.test(key)) {
      throw new EnvValueError('A setting name may only contain capital letters, digits and underscores.');
    }
  }
  const kept = linesOf(existing).filter((line) => !keys.some((key) => keyPattern(key).test(line)));
  return kept.length === 0 ? '' : `${kept.join('\n')}\n`;
}

/** Reads a value back, undoing the quoting done by `quoteEnvValue`. */
export function readEnvValue(text: string, key: string): string | undefined {
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (!keyPattern(key).test(line)) {
      continue;
    }
    const raw = line.slice(line.indexOf('=') + 1).trim();
    if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
      return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return raw;
  }
  return undefined;
}
