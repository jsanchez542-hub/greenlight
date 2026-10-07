export const DEFAULT_DEMO_BASE_PATH = '/greenlight';

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
