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

/**
 * Sets the given keys in the text of a .env file. Existing lines for those keys are
 * replaced in place, new keys are appended, and every other line, including comments,
 * is left exactly as it was.
 */
export function upsertEnv(existing: string, values: Record<string, string>): string {
  const lines = existing === '' ? [] : existing.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') {
    lines.pop();
  }

  for (const [key, value] of Object.entries(values)) {
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
