import { STATIC_DEMO } from './demo';

/**
 * The part of a finding's address. A key such as `orders:silent-error:0` holds colons, which a
 * folder name cannot on every system, and the demo is a set of folders, so there the colons
 * become tildes. Everywhere else the key is used as it is.
 */
export function routeKey(key: string, demo: boolean = STATIC_DEMO): string {
  return demo ? key.replaceAll(':', '~') : key;
}

export function findingHref(key: string): string {
  return `/findings/${encodeURIComponent(routeKey(key))}`;
}

export function workflowHref(id: string): string {
  return `/workflows/${encodeURIComponent(id)}`;
}

export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
