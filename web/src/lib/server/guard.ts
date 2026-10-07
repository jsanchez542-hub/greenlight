import { isAllowedHost } from './host';
import type { Environment } from './environment';

export interface RequestFacts {
  method: string;
  host: string | null;
  fetchSite: string | null;
}

export type GuardVerdict = { allowed: true } | { allowed: false; status: 403; message: string };

const READ_METHODS = new Set(['GET', 'HEAD']);

/**
 * The checks every API route makes before doing anything: the request must have been
 * addressed to this machine by name, and a browser must say it came from this very page.
 * A request with no Sec-Fetch-Site header comes from a program, not a web page, and a page
 * on another site cannot make the browser leave the header out.
 */
export function guardRequest(facts: RequestFacts, env: Environment): GuardVerdict {
  if (!isAllowedHost(facts.host, env)) {
    return { allowed: false, status: 403, message: 'This host is not allowed. Open the dashboard through localhost.' };
  }
  const { fetchSite } = facts;
  if (fetchSite === null || fetchSite === 'same-origin') {
    return { allowed: true };
  }
  if (fetchSite === 'none' && READ_METHODS.has(facts.method.toUpperCase())) {
    return { allowed: true };
  }
  return { allowed: false, status: 403, message: 'This route only answers requests made from the dashboard itself.' };
}
