import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import config from '../next.config';
import { config as proxyConfig, proxy } from '@/proxy';
import {
  PERMISSIONS_POLICY,
  buildContentSecurityPolicy,
  createNonce,
  securityHeaders,
} from '@/lib/security';

function directive(policy: string, name: string): string {
  const found = policy.split('; ').find((entry) => entry.startsWith(`${name} `));
  return found ?? '';
}

describe('buildContentSecurityPolicy', () => {
  const production = buildContentSecurityPolicy({ nonce: 'abc123', development: false });

  it('runs scripts only from this origin or with the nonce of the request, never inline', () => {
    const scripts = directive(production, 'script-src');
    expect(scripts).toBe("script-src 'self' 'nonce-abc123'");
    expect(scripts).not.toContain('unsafe-inline');
    expect(scripts).not.toContain('unsafe-eval');
  });

  it('allows styles only from this origin or with the nonce', () => {
    expect(directive(production, 'style-src')).toBe("style-src 'self' 'nonce-abc123'");
  });

  it('keeps every other source closed', () => {
    expect(production).toContain("default-src 'self'");
    expect(production).toContain("img-src 'self' data:");
    expect(production).toContain("connect-src 'self'");
    expect(directive(production, 'connect-src')).not.toContain('ws');
  });

  it('forbids framing, a changed base address, foreign form targets and plugins', () => {
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("base-uri 'none'");
    expect(production).toContain("form-action 'self'");
    expect(production).toContain("object-src 'none'");
  });

  it('never forces https, which would break the page on localhost', () => {
    expect(production).not.toContain('upgrade-insecure-requests');
  });

  it('loosens only what hot reloading needs, and only in development', () => {
    const development = buildContentSecurityPolicy({ nonce: 'abc123', development: true });
    expect(directive(development, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(development, 'style-src')).toContain("'unsafe-inline'");
    expect(directive(development, 'connect-src')).toContain('ws:');
    expect(production).not.toContain('unsafe');
  });
});

describe('createNonce', () => {
  it('is different every time and long enough to guess nothing', () => {
    const nonces = new Set(Array.from({ length: 50 }, () => createNonce()));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) {
      expect(nonce.length).toBeGreaterThanOrEqual(32);
      expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
    }
  });
});

describe('the static security headers', () => {
  const byKey = new Map(securityHeaders.map((entry) => [entry.key, entry.value]));

  it('stop framing, sniffing and leaking the address', () => {
    expect(byKey.get('X-Frame-Options')).toBe('DENY');
    expect(byKey.get('X-Content-Type-Options')).toBe('nosniff');
    expect(byKey.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('isolate the page from other windows and other origins', () => {
    expect(byKey.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(byKey.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
  });

  it('deny every browser feature except copying to the clipboard, which the page uses', () => {
    const policy = byKey.get('Permissions-Policy') ?? '';
    expect(policy).toBe(PERMISSIONS_POLICY);
    for (const feature of ['camera', 'microphone', 'geolocation', 'usb', 'payment', 'clipboard-read']) {
      expect(policy).toContain(`${feature}=()`);
    }
    expect(policy).toContain('clipboard-write=(self)');
  });

  it('are applied to every route by the framework configuration, and the server banner is off', async () => {
    const rules = await config.headers?.();
    expect(rules).toEqual([{ source: '/:path*', headers: [...securityHeaders] }]);
    expect(config.poweredByHeader).toBe(false);
  });
});

describe('proxy', () => {
  const response = proxy(new NextRequest('http://localhost:3000/findings'));
  const policy = response.headers.get('content-security-policy') ?? '';

  it('sends a policy with a fresh nonce on every page request', () => {
    expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);
    const other = proxy(new NextRequest('http://localhost:3000/findings')).headers.get('content-security-policy');
    expect(other).not.toBe(policy);
  });

  it('hands the same nonce to the page so its scripts can carry it', () => {
    const forwarded = response.headers.get('x-middleware-request-x-nonce') ?? '';
    expect(forwarded).not.toBe('');
    expect(policy).toContain(`'nonce-${forwarded}'`);
  });

  it('does not run for static assets, which the framework serves untouched', () => {
    expect(JSON.stringify(proxyConfig.matcher)).toContain('_next/static');
  });
});
