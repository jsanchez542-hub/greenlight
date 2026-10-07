import { createRequire } from 'node:module';

const load = createRequire(import.meta.url);
const manifest = load('../package.json') as { version: string };

/** The version of this copy of GreenLight, read from the package it ships in. */
export const VERSION: string = manifest.version;
