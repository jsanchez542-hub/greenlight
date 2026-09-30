import { describe, expect, it } from 'vitest';
import { isAllowedHost } from '@/lib/server/host';
import { scanIntervalMinutes } from '@/lib/server/live-scan';

describe('isAllowedHost', () => {
  it('accepts loopback names with or without a port', () => {
    expect(isAllowedHost('localhost:3000', {})).toBe(true);
    expect(isAllowedHost('127.0.0.1:3000', {})).toBe(true);
    expect(isAllowedHost('[::1]:3000', {})).toBe(true);
    expect(isAllowedHost('LOCALHOST', {})).toBe(true);
  });

  it('refuses any other name, which is what a rebinding attack presents', () => {
    expect(isAllowedHost('attacker.example:3000', {})).toBe(false);
    expect(isAllowedHost('localhost.attacker.example', {})).toBe(false);
  });

  it('refuses a missing or malformed header', () => {
    expect(isAllowedHost(null, {})).toBe(false);
    expect(isAllowedHost('not a host', {})).toBe(false);
  });

  it('accepts names the operator lists', () => {
    const env = { GREENLIGHT_ALLOWED_HOSTS: 'panel.internal, Ops.internal' };
    expect(isAllowedHost('panel.internal:8080', env)).toBe(true);
    expect(isAllowedHost('ops.internal', env)).toBe(true);
    expect(isAllowedHost('other.internal', env)).toBe(false);
  });
});

describe('scanIntervalMinutes', () => {
  it('defaults to five minutes', () => {
    expect(scanIntervalMinutes({})).toBe(5);
  });

  it('reads a positive whole number', () => {
    expect(scanIntervalMinutes({ GREENLIGHT_SCAN_INTERVAL_MINUTES: '15' })).toBe(15);
  });

  it('falls back to the default for anything else', () => {
    for (const value of ['0', '-3', '2.5', 'soon', '']) {
      expect(scanIntervalMinutes({ GREENLIGHT_SCAN_INTERVAL_MINUTES: value })).toBe(5);
    }
  });
});
