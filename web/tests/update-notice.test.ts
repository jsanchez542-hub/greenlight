import { REPOSITORY, releaseUrl } from 'greenlight';
import { describe, expect, it } from 'vitest';
import { fetchUpdateState, requestUpdateChoice } from '@/lib/update-client';
import {
  DISMISSED_UPDATE_KEY,
  RELEASES_PREFIX,
  parseUpdateState,
  readDismissedUpdate,
  releaseLink,
  updateNotice,
  writeDismissedUpdate,
  type UpdateState,
} from '@/lib/update-notice';

const signal = new AbortController().signal;
const page = 'https://github.com/jsanchez542-hub/greenlight/releases/tag/v1.2.0';

const newer: UpdateState = { enabled: true, current: '1.0.0', latest: '1.2.0', url: page };

function respondWith(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

describe('the address of the release', () => {
  it('is the one the scanner builds, so the two cannot drift apart', () => {
    expect(RELEASES_PREFIX).toBe(`https://github.com/${REPOSITORY}/releases/`);
    expect(releaseLink('1.2.0', releaseUrl('1.2.0'))).toBe(releaseUrl('1.2.0'));
  });

  it('is shown only when it is exactly the page of the version announced', () => {
    expect(releaseLink('1.2.0', page)).toBe(page);
  });

  it('is refused for any other address, however close it looks', () => {
    const hostile = [
      'https://evil.example/jsanchez542-hub/greenlight/releases/tag/v1.2.0',
      'http://github.com/jsanchez542-hub/greenlight/releases/tag/v1.2.0',
      'https://github.com.evil.example/jsanchez542-hub/greenlight/releases/tag/v1.2.0',
      'https://github.com@evil.example/jsanchez542-hub/greenlight/releases/tag/v1.2.0',
      'https://github.com/jsanchez542-hub/greenlight/releases/tag/v1.2.0/../../../../evil',
      'https://github.com/jsanchez542-hub/greenlight/releases/tag/v1.2.0?next=https://evil.example',
      'https://github.com/jsanchez542-hub/greenlight/releases/tag/v1.2.0#x',
      'https://github.com/jsanchez542-hub/greenlight/releases/tag/v9.9.9',
      'https://github.com/jsanchez542-hub/greenlight-evil/releases/tag/v1.2.0',
      'https://github.com/jsanchez542-hub/greenlight/releases/',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '//evil.example/',
      '',
    ];
    for (const url of hostile) {
      expect(releaseLink('1.2.0', url), url).toBeNull();
    }
  });

  it('is refused for a version that is not a plain number', () => {
    for (const latest of ['latest', '1.2', '1.2.0-beta', '<b>1.2.0</b>', '1.2.0/../x', '']) {
      expect(releaseLink(latest, `${RELEASES_PREFIX}tag/v${latest}`), latest).toBeNull();
    }
  });
});

describe('updateNotice', () => {
  it('shows a newer version with a link to its page', () => {
    expect(updateNotice(newer, null)).toEqual({ latest: '1.2.0', url: page });
  });

  it('shows nothing before the answer arrives, when the notice is off or when nothing is newer', () => {
    expect(updateNotice(null, null)).toBeNull();
    expect(updateNotice({ enabled: false, chosen: false }, null)).toBeNull();
    expect(updateNotice({ enabled: true, current: '1.0.0', latest: null, url: null }, null)).toBeNull();
  });

  it('shows nothing when the address is not the expected one', () => {
    expect(updateNotice({ ...newer, url: 'https://evil.example/' }, null)).toBeNull();
  });

  it('stays dismissed for that version and comes back for the next one', () => {
    expect(updateNotice(newer, '1.2.0')).toBeNull();
    expect(updateNotice({ ...newer, latest: '1.3.0', url: releaseUrl('1.3.0') }, '1.2.0')).toEqual({
      latest: '1.3.0',
      url: releaseUrl('1.3.0'),
    });
  });
});

describe('remembering a dismissal', () => {
  function storage(initial: string | null = null) {
    let value = initial;
    return {
      getItem: (key: string) => (key === DISMISSED_UPDATE_KEY ? value : null),
      setItem: (key: string, next: string) => {
        if (key === DISMISSED_UPDATE_KEY) {
          value = next;
        }
      },
      read: () => value,
    };
  }

  it('keeps the version in the browser storage only', () => {
    const store = storage();
    writeDismissedUpdate(store, '1.2.0');
    expect(store.read()).toBe('1.2.0');
    expect(readDismissedUpdate(store)).toBe('1.2.0');
  });

  it('ignores a stored value that is not a version, and never stores one', () => {
    expect(readDismissedUpdate(storage('<script>'))).toBeNull();
    const store = storage();
    writeDismissedUpdate(store, '<script>');
    expect(store.read()).toBeNull();
  });

  it('survives storage that is blocked or missing', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readDismissedUpdate(blocked)).toBeNull();
    expect(() => writeDismissedUpdate(blocked, '1.2.0')).not.toThrow();
    expect(readDismissedUpdate(undefined)).toBeNull();
    expect(() => writeDismissedUpdate(undefined, '1.2.0')).not.toThrow();
  });
});

describe('parseUpdateState', () => {
  it('reads the three answers the server gives', () => {
    expect(parseUpdateState({ enabled: false, chosen: true })).toEqual({ enabled: false, chosen: true });
    expect(parseUpdateState({ enabled: false })).toEqual({ enabled: false, chosen: false });
    expect(parseUpdateState({ enabled: true, current: '1.0.0', latest: null, url: null })).toEqual({
      enabled: true,
      current: '1.0.0',
      latest: null,
      url: null,
    });
    expect(parseUpdateState({ enabled: true, current: '1.0.0', latest: '1.2.0', url: page })).toEqual(newer);
  });

  it('rejects an answer that does not follow the contract', () => {
    expect(() => parseUpdateState(null)).toThrow();
    expect(() => parseUpdateState({ enabled: 'yes' })).toThrow();
    expect(() => parseUpdateState({ enabled: true, current: 1 })).toThrow();
  });
});

describe('the requests of the page', () => {
  it('asks for the state with a plain GET to this site and nothing else', async () => {
    const seen: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      seen.push({ url: String(url), init });
      return new Response(JSON.stringify({ enabled: false, chosen: false }), { status: 200 });
    };
    expect(await fetchUpdateState(signal, fetchImpl)).toEqual({ enabled: false, chosen: false });
    expect(seen[0]?.url).toBe('/api/update');
    expect(seen[0]?.init?.method).toBe('GET');
    expect(seen[0]?.init?.body).toBeUndefined();
    expect(seen[0]?.init?.credentials).toBe('same-origin');
    expect(seen[0]?.init?.referrerPolicy).toBe('no-referrer');
  });

  it('sends the choice as JSON with a boolean and nothing more', async () => {
    const bodies: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      bodies.push(String(init?.body));
      expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
      return new Response(JSON.stringify({ enabled: true, notice: null }), { status: 200 });
    };
    expect(await requestUpdateChoice(true, signal, fetchImpl)).toEqual({ enabled: true, notice: null });
    expect(JSON.parse(bodies[0] ?? '')).toEqual({ enabled: true });
  });

  it('names why a choice was refused, never in the words of the server', async () => {
    await expect(requestUpdateChoice(true, signal, respondWith({ error: 'rateLimited', retryAfterSeconds: 2 }, 429))).rejects.toMatchObject({
      code: 'rateLimited',
      seconds: 2,
    });
    await expect(requestUpdateChoice(true, signal, respondWith({ error: 'Try later <b>' }, 500))).rejects.toMatchObject({
      code: 'serverStatus',
    });
  });

  it('turns a server that cannot be reached or an answer that is wrong into a plain failure', async () => {
    const offline: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(fetchUpdateState(signal, offline)).rejects.toMatchObject({ code: 'serverSilent' });
    await expect(fetchUpdateState(signal, respondWith({ enabled: 'maybe' }))).rejects.toMatchObject({ code: 'invalidAnswer' });
  });
});
