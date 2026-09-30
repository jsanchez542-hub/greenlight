import path from 'node:path';
import type { NextConfig } from 'next';

const repositoryRoot = path.join(import.meta.dirname, '..');

const config: NextConfig = {
  serverExternalPackages: ['greenlight'],
  outputFileTracingRoot: repositoryRoot,
  turbopack: { root: repositoryRoot },
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default config;
