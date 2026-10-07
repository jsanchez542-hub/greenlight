export interface PolicyOptions {
  nonce: string;
  development: boolean;
}

/**
 * The policy every page is served with. Scripts run only from this origin or with the
 * one-time nonce of the request, styles only from this origin, and nothing can frame the page,
 * set its base address, submit a form elsewhere or load a plugin. Development needs eval and
 * inline styles for hot reloading, so those are added there and only there.
 */
export function buildContentSecurityPolicy({ nonce, development }: PolicyOptions): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ''}`,
    development ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  return directives.join('; ');
}

export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'bluetooth=()',
  'camera=()',
  'clipboard-read=()',
  'clipboard-write=(self)',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=()',
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'serial=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

export interface HeaderEntry {
  key: string;
  value: string;
}

export const securityHeaders: readonly HeaderEntry[] = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
];

export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}
