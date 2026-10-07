import path from 'node:path';
import type { NextConfig } from 'next';
import { securityHeaders } from './src/lib/security';

const repositoryRoot = path.join(import.meta.dirname, '..');

const config: NextConfig = {
  serverExternalPackages: ['greenlight'],
  outputFileTracingRoot: repositoryRoot,
  turbopack: { root: repositoryRoot },
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [{ source: '/:path*', headers: [...securityHeaders] }];
  },
};

export default config;
