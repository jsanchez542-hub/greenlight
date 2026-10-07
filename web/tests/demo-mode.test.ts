import { afterEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { connectEntry, connectTexts } from '@/lib/connect-entry';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('the entry that leads to the connection', () => {
  it('says Connect with the state of the connection in the real dashboard', () => {
    expect(connectTexts(en, connectEntry(false, null), false)).toEqual({
      label: 'Connect',
      detail: 'not connected',
      title: 'Connect your n8n',
    });
    expect(connectTexts(es, connectEntry(true, 'n8n.example.com'), false)).toEqual({
      label: 'Conectado',
      detail: 'n8n.example.com',
      title: 'Conectado a n8n.example.com',
    });
  });

  it('says Install in the demo, whatever the connection', () => {
    expect(connectTexts(en, connectEntry(false, null), true)).toEqual({
      label: 'Install',
      detail: 'this is a demo',
      title: 'How to install GreenLight',
    });
    expect(connectTexts(es, connectEntry(true, 'x'), true).label).toBe('Instalar');
  });
});

describe('what the demo is built to be', () => {
  async function load(demo: boolean) {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_STATIC_DEMO', demo ? '1' : '');
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', demo ? '/greenlight' : '');
    return { demo: await import('@/lib/demo'), sources: await import('@/lib/browser-sources') };
  }

  function browser() {
    const writes: string[] = [];
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    vi.stubGlobal('document', {
      get cookie() {
        return 'greenlight_ui=welcome-v1';
      },
      set cookie(value: string) {
        writes.push(value);
      },
    });
    return { writes, store };
  }

  it('is the real dashboard unless built as the demo', async () => {
    const { demo } = await load(false);
    expect(demo.STATIC_DEMO).toBe(false);
    expect(demo.BASE_PATH).toBe('');
  });

  it('writes no cookie and reads none in the demo, and keeps what it remembers in the browser storage', async () => {
    const { demo, sources } = await load(true);
    const { writes, store } = browser();
    expect(demo.STATIC_DEMO).toBe(true);
    expect(demo.BASE_PATH).toBe('/greenlight');

    const jar = sources.browserSources();
    jar.writeCookie('greenlight_ui=welcome-v1; Path=/');
    expect(jar.readCookies()).toBe('');
    jar.storage?.setItem('greenlight.welcome.v1', '1');

    expect(writes).toEqual([]);
    expect(store.get('greenlight.welcome.v1')).toBe('1');
  });

  it('still writes the interface cookie in the real dashboard', async () => {
    const { sources } = await load(false);
    const { writes } = browser();
    const jar = sources.browserSources();
    jar.writeCookie('greenlight_ui=welcome-v1; Path=/');
    expect(jar.readCookies()).toBe('greenlight_ui=welcome-v1');
    expect(writes).toEqual(['greenlight_ui=welcome-v1; Path=/']);
  });
});
