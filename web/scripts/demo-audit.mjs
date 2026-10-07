import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { contentSecurityPolicy, inlineScriptHashes, policyOf } from './demo-policy.mjs';

const OWN_REPOSITORY_PATH = '/jsanchez542-hub/';
const OWN_SITE = 'jsanchez542-hub.github.io';
const TEXT = new Set(['.html', '.txt', '.js', '.css', '.json', '.svg', '.webmanifest']);
const BINARY = new Set(['.png', '.ico', '.woff2']);

/**
 * Hosts that appear in the built files without ever being contacted: the namespace of SVG, the
 * addresses of error pages inside React and Next, the examples shown as placeholders, and the
 * one-letter hosts the router uses to resolve relative addresses.
 */
const INERT_HOSTS = new Set([
  'www.w3.org',
  'nextjs.org',
  'react.dev',
  'n8n.yourcompany.com',
  'n8n.tuempresa.com',
  'n8n.example.com',
]);

const NEVER = [
  ['/api/', 'a path of the API, which the demo has none of'],
  ['N8N_API_KEY', 'the name of the setting that holds the key'],
  ['sendBeacon', 'a beacon'],
  ['WebSocket', 'a socket'],
  ['EventSource', 'an event stream'],
];

const ABSOLUTE_FETCH = /(?:fetch|\.open)\(\s*(?:"[^"]*",\s*)?[`'"]https?:/;
const URL_PATTERN = /https?:\/\/[^\s"'`<>\\)]+/g;

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function hostProblem(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const { hostname, pathname } = url;
  if (hostname === 'github.com') {
    return pathname === '/jsanchez542-hub' || pathname.startsWith(OWN_REPOSITORY_PATH) ? null : `a GitHub address that is not ${OWN_REPOSITORY_PATH}: ${raw}`;
  }
  if (hostname === OWN_SITE || INERT_HOSTS.has(hostname) || hostname.length === 1) {
    return null;
  }
  return `an address of another site: ${raw}`;
}

function polyfillScripts(html) {
  const found = [];
  let position = 0;
  for (;;) {
    const start = html.indexOf('<script', position);
    const end = start === -1 ? -1 : html.indexOf('>', start);
    if (end === -1) {
      return found;
    }
    const tag = html.slice(start, end);
    if (/noModule/i.test(tag)) {
      const source = /src="([^"]+)"/.exec(tag);
      if (source?.[1] !== undefined) {
        found.push(source[1]);
      }
    }
    position = end;
  }
}

/**
 * Looks through every file of the built demo for anything that would make it more than a set of
 * pages with invented data: a way to reach a server, another site, a form, the key, or a page
 * that does not carry the policy it was built with. It returns what it found; nothing found is
 * the only acceptable answer.
 */
export function auditDemo(directory) {
  const problems = [];
  const files = walk(directory);
  const polyfills = new Set();
  const pages = files.filter((file) => path.extname(file) === '.html');

  for (const page of pages) {
    for (const source of polyfillScripts(readFileSync(page, 'utf8'))) {
      polyfills.add(path.basename(source));
    }
  }

  for (const file of files) {
    const relative = path.relative(directory, file).split(path.sep).join('/');
    const extension = path.extname(file);
    if (relative === '.nojekyll') {
      continue;
    }
    if (!TEXT.has(extension) && !BINARY.has(extension)) {
      problems.push(`${relative}: a kind of file that has no place in the demo`);
      continue;
    }
    if (!TEXT.has(extension)) {
      continue;
    }
    const text = readFileSync(file, 'utf8');

    const isPolyfill = polyfills.has(path.basename(file));

    for (const [needle, meaning] of NEVER) {
      if (text.includes(needle)) {
        problems.push(`${relative}: contains ${needle}, ${meaning}`);
      }
    }
    if (ABSOLUTE_FETCH.test(text)) {
      problems.push(`${relative}: asks for an absolute address with fetch or XMLHttpRequest`);
    }
    if (text.includes('XMLHttpRequest') && !isPolyfill) {
      problems.push(`${relative}: uses XMLHttpRequest outside the fallback for old browsers`);
    }
    for (const match of isPolyfill ? [] : (text.match(URL_PATTERN) ?? [])) {
      const problem = hostProblem(match);
      if (problem !== null) {
        problems.push(`${relative}: ${problem}`);
      }
    }

    if (extension === '.html') {
      if (/<form[\s>]/i.test(text)) {
        problems.push(`${relative}: contains a form`);
      }
      if (/type="password"/i.test(text)) {
        problems.push(`${relative}: contains a password field`);
      }
      const policy = policyOf(text);
      if (policy === null) {
        problems.push(`${relative}: has no content security policy`);
      } else {
        if (policy !== contentSecurityPolicy(inlineScriptHashes(text))) {
          problems.push(`${relative}: its content security policy does not match its scripts`);
        }
        if (/unsafe-(?:inline|eval)/.test(policy)) {
          problems.push(`${relative}: its policy allows unsafe code`);
        }
        const firstScript = text.indexOf('<script');
        if (firstScript !== -1 && text.indexOf('http-equiv="Content-Security-Policy"') > firstScript) {
          problems.push(`${relative}: its policy comes after a script`);
        }
      }
    }
  }

  return { problems, files: files.length };
}
