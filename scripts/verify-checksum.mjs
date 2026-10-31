// Fails unless a file has the SHA-256 it is expected to have. The release uses it to be sure that
// the package it publishes and the package it tried are the same file.
//
//   node scripts/verify-checksum.mjs <file> <sha256>

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [file, expected] = process.argv.slice(2);
if (file === undefined || !/^[0-9a-f]{64}$/.test(expected ?? '')) {
  process.stderr.write('Usage: node scripts/verify-checksum.mjs <file> <sha256 in lowercase hex>\n');
  process.exit(2);
}

const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
if (actual !== expected) {
  process.stderr.write(`${file} is not the file that was built.\n  expected ${expected}\n  found    ${actual}\n`);
  process.exit(1);
}
process.stdout.write(`${file} matches ${expected}\n`);
