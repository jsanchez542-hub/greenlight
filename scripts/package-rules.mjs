// What the package that gets published must look like. These rules are checked on the real
// tarball before anything is published, so a file that should not be there, a script that runs
// on install or a dependency that crept in stops the release instead of reaching people.

export const PACKAGE_NAME = 'greenlight-n8n';
export const REPOSITORY_URL = 'git+https://github.com/jsanchez542-hub/greenlight.git';

const ALLOWED = [
  /^package\.json$/,
  /^README(\.es)?\.md$/,
  /^LICENSE$/,
  /^CHANGELOG\.md$/,
  /^dist\/.+\.js$/,
  /^dist\/.+\.d\.ts$/,
];

const REQUIRED = [
  'package.json',
  'README.md',
  'LICENSE',
  'dist/cli.js',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/i18n/index.js',
  'dist/i18n/index.d.ts',
];

// The allowed list already leaves these out. They are named again so that widening it by mistake
// still cannot ship an environment file, a source map or a copy of the repository.
const FORBIDDEN = [/(^|\/)\.env/, /\.map$/, /^src\//, /^tests?\//, /^web\//, /^examples\//, /^scripts\//, /^\.github\//, /node_modules/, /\.greenlight-/];

const INSTALL_HOOKS = ['preinstall', 'install', 'postinstall'];

const LIMITS = { packedBytes: 150_000, unpackedBytes: 500_000 };

/**
 * @param {{ files: string[], size: number, unpackedSize: number }} pack what `npm pack --json` reports
 * @param {Record<string, any>} manifest the package.json that is packed
 * @param {string} cliStart the first bytes of dist/cli.js
 * @returns {string[]} one sentence per rule that is broken; empty when the package is fine
 */
export function checkPackage(pack, manifest, cliStart) {
  const problems = [];
  const files = new Set(pack.files);

  if (manifest.name !== PACKAGE_NAME) {
    problems.push(`The package is called "${manifest.name}", not "${PACKAGE_NAME}".`);
  }
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(String(manifest.version))) {
    problems.push(`The version "${manifest.version}" is not a plain semantic version.`);
  }

  for (const path of pack.files) {
    if (FORBIDDEN.some((pattern) => pattern.test(path))) {
      problems.push(`The package would include ${path}, which must never be published.`);
    } else if (!ALLOWED.some((pattern) => pattern.test(path))) {
      problems.push(`The package would include ${path}, which is not on the list of what ships.`);
    }
  }
  for (const path of REQUIRED) {
    if (!files.has(path)) {
      problems.push(`The package is missing ${path}.`);
    }
  }

  for (const command of [PACKAGE_NAME, 'greenlight']) {
    const target = manifest.bin?.[command];
    if (target !== 'dist/cli.js') {
      problems.push(`The command ${command} must run dist/cli.js, it runs ${target ?? 'nothing'}.`);
    }
  }
  if (!cliStart.startsWith('#!/usr/bin/env node\n')) {
    problems.push('dist/cli.js must start with "#!/usr/bin/env node" and a plain line feed.');
  }

  for (const hook of INSTALL_HOOKS) {
    if (manifest.scripts?.[hook] !== undefined) {
      problems.push(`The script "${hook}" would run on the computer of whoever installs the package.`);
    }
  }
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies', 'bundleDependencies', 'bundledDependencies']) {
    const value = manifest[field];
    if (value !== undefined && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)) {
      problems.push(`The package must not have ${field}: it ships with none, and every one is a way in.`);
    }
  }

  if (manifest.repository?.url !== REPOSITORY_URL) {
    problems.push(`repository.url must be ${REPOSITORY_URL}, which is what the provenance is checked against.`);
  }
  if (manifest.publishConfig?.provenance !== true) {
    problems.push('publishConfig.provenance must be true, so a publish outside a supported build fails.');
  }
  if (manifest.publishConfig?.access !== 'public') {
    problems.push('publishConfig.access must be "public".');
  }
  if (manifest.license !== 'MIT') {
    problems.push(`The license is "${manifest.license}", not MIT.`);
  }
  if (typeof manifest.engines?.node !== 'string') {
    problems.push('engines.node must say which Node.js the package needs.');
  }

  if (pack.size > LIMITS.packedBytes) {
    problems.push(`The package is ${pack.size} bytes packed, over the limit of ${LIMITS.packedBytes}.`);
  }
  if (pack.unpackedSize > LIMITS.unpackedBytes) {
    problems.push(`The package is ${pack.unpackedSize} bytes unpacked, over the limit of ${LIMITS.unpackedBytes}.`);
  }

  return problems;
}
