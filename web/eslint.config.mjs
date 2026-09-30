import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores(['.next/**', 'next-env.d.ts', 'node_modules/**']),
]);
