import { createHash } from 'node:crypto';

const OPEN = '<script';
const CLOSE = '</script>';

function hasSource(attributes) {
  return /(?:^|\s)src\s*=/.test(attributes);
}

export function inlineScripts(html) {
  const found = [];
  let position = 0;
  for (;;) {
    const start = html.indexOf(OPEN, position);
    if (start === -1) {
      return found;
    }
    const tagEnd = html.indexOf('>', start);
    const close = tagEnd === -1 ? -1 : html.indexOf(CLOSE, tagEnd);
    if (close === -1) {
      return found;
    }
    const attributes = html.slice(start + OPEN.length, tagEnd);
    if (!hasSource(attributes)) {
      found.push(html.slice(tagEnd + 1, close));
    }
    position = close + CLOSE.length;
  }
}

export function inlineScriptHashes(html) {
  const hashes = inlineScripts(html).map((script) => `'sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}'`);
  return [...new Set(hashes)].sort();
}

/**
 * The page cannot send headers, so the policy travels in the page. Scripts run only from this
 * site or when they are one of the inline scripts the page was built with, named by their hash.
 * The page reads files of its own site to move between pages and talks to nothing else.
 */
export function contentSecurityPolicy(hashes) {
  return [
    "default-src 'none'",
    `script-src 'self'${hashes.length === 0 ? '' : ` ${hashes.join(' ')}`}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ].join('; ');
}

const POLICY_TAG = 'http-equiv="Content-Security-Policy"';

export function policyTag(hashes) {
  return `<meta ${POLICY_TAG} content="${contentSecurityPolicy(hashes)}"/>`;
}

/** The page with its policy as the first thing in the head, so that it governs every script after it. */
export function withPolicy(html) {
  const head = html.indexOf('<head>');
  if (head === -1) {
    throw new Error('A page of the demo has no <head> to put its content security policy in.');
  }
  const at = head + '<head>'.length;
  return `${html.slice(0, at)}${policyTag(inlineScriptHashes(html))}${html.slice(at)}`;
}

export function policyOf(html) {
  const marker = html.indexOf(POLICY_TAG);
  if (marker === -1) {
    return null;
  }
  const start = html.indexOf('content="', marker);
  const end = start === -1 ? -1 : html.indexOf('"', start + 'content="'.length);
  return end === -1 ? null : html.slice(start + 'content="'.length, end);
}
