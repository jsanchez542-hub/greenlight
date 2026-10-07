const MAX_URL_LENGTH = 2048;

export type InstanceUrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/**
 * The address of n8n is the one place the server is told to contact, and the API key travels
 * with every request. It must be a plain http or https address with no credentials in it.
 */
export function checkInstanceUrl(raw: string | undefined): InstanceUrlCheck {
  const value = raw?.trim() ?? '';
  if (value === '') {
    return { ok: false, reason: 'No address was given.' };
  }
  if (value.length > MAX_URL_LENGTH) {
    return { ok: false, reason: 'The address is too long.' };
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: 'That is not a valid web address.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'The address must start with http:// or https://.' };
  }
  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'The address contains a user name or password.' };
  }
  return { ok: true, url };
}
