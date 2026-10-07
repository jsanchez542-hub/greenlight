import type { FailureCode } from '../failure';
import { isAllowedHost } from './host';
import type { Environment } from './environment';

export interface RequestFacts {
  method: string;
  host: string | null;
  fetchSite: string | null;
}

export type GuardVerdict = { allowed: true } | { allowed: false; status: 403; code: FailureCode };

const READ_METHODS = new Set(['GET', 'HEAD']);

/**
 * The checks every API route makes before doing anything: the request must have been
 * addressed to this machine by name, and a browser must say it came from this very page.
 * A request with no Sec-Fetch-Site header comes from a program, not a web page, and a page
 * on another site cannot make the browser leave the header out.
 */
export function guardRequest(facts: RequestFacts, env: Environment): GuardVerdict {
  if (!isAllowedHost(facts.host, env)) {
    return { allowed: false, status: 403, code: 'hostNotAllowed' };
  }
  const { fetchSite } = facts;
  if (fetchSite === null || fetchSite === 'same-origin') {
    return { allowed: true };
  }
  if (fetchSite === 'none' && READ_METHODS.has(facts.method.toUpperCase())) {
    return { allowed: true };
  }
  return { allowed: false, status: 403, code: 'notFromDashboard' };
}

export interface WriteFacts extends RequestFacts {
  origin: string | null;
}

function sameHost(origin: string, host: string): boolean {
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * The stricter check for a request that changes something. It must be addressed to this
 * machine by name and come from the dashboard's own page: a browser says so with
 * Sec-Fetch-Site, and a browser too old to send it still sends an Origin that must be exactly
 * this host. A request that proves neither, such as one from a script, is refused.
 */
export function guardWrite(facts: WriteFacts, env: Environment): GuardVerdict {
  if (!isAllowedHost(facts.host, env)) {
    return { allowed: false, status: 403, code: 'hostNotAllowed' };
  }
  const refusal: GuardVerdict = { allowed: false, status: 403, code: 'settingsNotFromDashboard' };
  if (facts.fetchSite !== null) {
    return facts.fetchSite === 'same-origin' ? { allowed: true } : refusal;
  }
  return facts.origin !== null && facts.host !== null && sameHost(facts.origin, facts.host) ? { allowed: true } : refusal;
}
