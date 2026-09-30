import path from 'node:path';
import type { NextConfig } from 'next';

const repositoryRoot = path.join(import.meta.dirname, '..');

const config: NextConfig = {
  serverExternalPackages: ['greenlight'],
  outputFileTracingRoot: repositoryRoot,
  turbopack: { root: repositoryRoot },
  poweredByHeader: false,
};

export default config;
