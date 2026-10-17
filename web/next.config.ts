import path from 'node:path';
import type { NextConfig } from 'next';
import { demoBasePath, demoOrigin } from './src/lib/demo-site';
import { securityHeaders } from './src/lib/security';

const repositoryRoot = path.join(import.meta.dirname, '..');
const demo = process.env['GREENLIGHT_STATIC_DEMO'] === '1';

const shared: NextConfig = {
  serverExternalPackages: ['greenlight'],
  outputFileTracingRoot: repositoryRoot,
  turbopack: { root: repositoryRoot },
  poweredByHeader: false,
  devIndicators: false,
};

/**
 * The demo is the same dashboard exported as plain files, with no server. Only the files named
 * *.demo.tsx are pages in that build, so the real pages, the routes that read the settings and
 * the proxy never enter it, and the normal build never sees the demo files.
 */
function demoConfig(): NextConfig {
  const basePath = demoBasePath(process.env['GREENLIGHT_DEMO_BASE_PATH']);
  const origin = demoOrigin(process.env['GREENLIGHT_DEMO_ORIGIN']);
  return {
    ...shared,
    output: 'export',
    distDir: '.next-demo',
    basePath,
    assetPrefix: basePath,
    trailingSlash: true,
    pageExtensions: ['demo.tsx', 'demo.ts'],
    images: { unoptimized: true },
    env: { NEXT_PUBLIC_STATIC_DEMO: '1', NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_SITE_ORIGIN: origin },
  };
}

const config: NextConfig = demo
  ? demoConfig()
  : {
      ...shared,
      async headers() {
        return [{ source: '/:path*', headers: [...securityHeaders] }];
      },
    };

export default config;
