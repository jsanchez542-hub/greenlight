/**
 * Both values are fixed when the page is built: the demo is a separate build of the same
 * dashboard, exported as plain files, and these are how the shared code knows which one it is in.
 */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === '1';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? '';

/** The absolute address of a page of the demo, for links that are read on other sites. */
export function siteUrl(path: string, origin: string = SITE_ORIGIN, basePath: string = BASE_PATH): string {
  return `${origin}${basePath}${path}`;
}

export const REPOSITORY_URL = 'https://github.com/jsanchez542-hub/greenlight';
export const INSTALL_COMMANDS = [
  'git clone https://github.com/jsanchez542-hub/greenlight.git',
  'cd greenlight',
  'npm install && npm run panel',
] as const;
