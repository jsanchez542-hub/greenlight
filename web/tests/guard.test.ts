import { describe, expect, it } from 'vitest';
import { guardRequest } from '@/lib/server/guard';

const local = { method: 'GET', host: 'localhost:3000', fetchSite: null };

describe('guardRequest', () => {
  it('lets the dashboard reach its own routes', () => {
    expect(guardRequest({ ...local, fetchSite: 'same-origin' }, {})).toEqual({ allowed: true });
    expect(guardRequest({ ...local, method: 'POST', fetchSite: 'same-origin' }, {})).toEqual({ allowed: true });
  });

  it('lets a program such as curl through, since only a browser sends Sec-Fetch-Site', () => {
    expect(guardRequest({ ...local, method: 'POST' }, {})).toEqual({ allowed: true });
  });

  it('refuses a request addressed to another name, which is how DNS rebinding arrives', () => {
    const verdict = guardRequest({ ...local, host: 'attacker.example:3000', fetchSite: 'same-origin' }, {});
    expect(verdict).toMatchObject({ allowed: false, status: 403 });
  });

  it('refuses a missing Host header', () => {
    expect(guardRequest({ ...local, host: null }, {})).toMatchObject({ allowed: false });
  });

  it('refuses a page on another site, for reading and for writing', () => {
    for (const fetchSite of ['cross-site', 'same-site']) {
      expect(guardRequest({ ...local, fetchSite }, {})).toMatchObject({ allowed: false, status: 403 });
      expect(guardRequest({ ...local, method: 'POST', fetchSite }, {})).toMatchObject({ allowed: false });
    }
  });

  it('lets a person open a read route by typing its address, but never start a scan that way', () => {
    expect(guardRequest({ ...local, fetchSite: 'none' }, {})).toEqual({ allowed: true });
    expect(guardRequest({ ...local, method: 'POST', fetchSite: 'none' }, {})).toMatchObject({ allowed: false });
  });

  it('honours the host names the operator lists', () => {
    const env = { GREENLIGHT_ALLOWED_HOSTS: 'panel.internal' };
    expect(guardRequest({ ...local, host: 'panel.internal' }, env)).toEqual({ allowed: true });
  });

  it('never repeats the offending host in its message', () => {
    const verdict = guardRequest({ ...local, host: '<script>alert(1)</script>.example' }, {});
    expect(verdict.allowed).toBe(false);
    expect(JSON.stringify(verdict)).not.toContain('script');
  });
});
