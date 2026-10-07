import { existsSync } from 'node:fs';
import path from 'node:path';
import { auditDemo } from './demo-audit.mjs';

const directory = path.resolve(process.argv[2] ?? 'out');

if (!existsSync(directory)) {
  process.stderr.write(`There is no demo to audit at ${directory}. Run npm run build:demo first.\n`);
  process.exit(2);
}

const { problems, files } = auditDemo(directory);
if (problems.length > 0) {
  process.stderr.write(`The demo is not clean (${problems.length} problems in ${files} files):\n`);
  for (const problem of problems) {
    process.stderr.write(`  ${problem}\n`);
  }
  process.exit(1);
}
process.stdout.write(`The demo is clean: ${files} files, no API, no form, no other site, every page carries its policy.\n`);
