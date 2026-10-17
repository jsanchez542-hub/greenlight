export const DEFAULT_DEMO_BASE_PATH = '/greenlight';
export const DEFAULT_DEMO_ORIGIN = 'https://jsanchez542-hub.github.io';

/**
 * The folder the demo is served from, such as /greenlight for a project page. It ends up inside
 * every link and every script address of the built files, so only the characters of an ordinary
 * folder name are accepted, and an empty value means the demo is served from the root.
 */
export function demoBasePath(raw: string | undefined): string {
  if (raw === undefined) {
    return DEFAULT_DEMO_BASE_PATH;
  }
  const value = raw.trim();
  if (value === '' || value === '/') {
    return '';
  }
  if (!/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/.test(value) || value.split('/').some((part) => part === '.' || part === '..')) {
    throw new Error('GREENLIGHT_DEMO_BASE_PATH must look like /greenlight: a slash and plain folder names, with no slash at the end.');
  }
  return value;
}

/**
 * The site the demo is published on, as https://host. Links shared on other sites need absolute
 * addresses, so it goes into the canonical address and the social preview of every page; only a
 * bare https origin is accepted, with no path, no credentials and nothing after it.
 */
export function demoOrigin(raw: string | undefined): string {
  const value = (raw ?? DEFAULT_DEMO_ORIGIN).trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('GREENLIGHT_DEMO_ORIGIN must be an https address such as https://example.github.io.');
  }
  const bare = url.protocol === 'https:' && url.username === '' && url.password === '' && url.search === '' && url.hash === '';
  if (!bare || url.pathname !== '/' || value.replace(/\/$/, '') !== url.origin) {
    throw new Error('GREENLIGHT_DEMO_ORIGIN must be an https address such as https://example.github.io, with nothing after the host.');
  }
  return url.origin;
}
