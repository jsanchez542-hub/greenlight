const MAX_ADDRESS_LENGTH = 2048;

/** The address as a web address, or null when it is not a plain http or https one. */
export function parseAddress(raw: string): URL | null {
  const value = raw.trim();
  if (value === '' || value.length > MAX_ADDRESS_LENGTH) {
    return null;
  }
  try {
    const url = new URL(value);
    const plain = url.protocol === 'http:' || url.protocol === 'https:';
    return plain && url.username === '' && url.password === '' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Where n8n keeps its keys, built from the address that was typed. It is only ever offered for
 * a plain http or https address, so what the person typed can never become another kind of link.
 */
export function settingsLink(raw: string): string | null {
  const url = parseAddress(raw);
  if (url === null) {
    return null;
  }
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${path}/settings/api`;
}
