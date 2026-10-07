import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * The optional "a new version is out" notice. It is off unless the person turns it on, and when
 * it is on it makes one request: a plain GET for the number of the latest release. No key, no
 * address of the n8n instance and nothing about the person is sent. A failure of any kind is
 * silent, because a notice must never get in the way of the work.
 */

export const REPOSITORY = 'jsanchez542-hub/greenlight';
const LATEST_RELEASE = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_CHARS = 200_000;

export interface UpdateInfo {
  current: string;
  latest: string;
  /** Always built from the version number, never taken from the response. */
  url: string;
}

export function updateChecksEnabled(env: Record<string, string | undefined>): boolean {
  const value = env['GREENLIGHT_CHECK_UPDATES']?.trim().toLowerCase();
  return value === '1' || value === 'true';
}

const RELEASE_TAG = /^v?(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/;

/** "v1.2.3" and "1.2.3" are versions; "1.2.3-beta.1", "latest" or anything else is not. */
export function parseVersion(tag: unknown): [number, number, number] | null {
  if (typeof tag !== 'string') {
    return null;
  }
  const match = RELEASE_TAG.exec(tag.trim());
  return match === null ? null : [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (a === null || b === null) {
    return false;
  }
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) {
      return difference > 0;
    }
  }
  return false;
}

export function releaseUrl(version: string): string {
  return `https://github.com/${REPOSITORY}/releases/tag/v${version.replace(/^v/, '')}`;
}

export interface CheckOptions {
  current: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  /** Where the latest release is asked for. Only tests change it. */
  endpoint?: string;
}

/** The number of the latest published release, or null when it cannot be told. */
export async function fetchLatestVersion(options: CheckOptions): Promise<string | null> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  try {
    const response = await fetchImpl(options.endpoint ?? LATEST_RELEASE, {
      method: 'GET',
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': `greenlight/${options.current}`,
        'x-github-api-version': '2022-11-28',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(options.timeoutMs ?? 3000),
    });
    if (!response.ok) {
      return null;
    }
    const body = await response.text();
    if (body.length > MAX_BODY_CHARS) {
      return null;
    }
    const parsed = JSON.parse(body) as { tag_name?: unknown };
    const version = parseVersion(parsed.tag_name);
    return version === null ? null : version.join('.');
  } catch {
    return null;
  }
}

export interface UpdateCache {
  read(): { checkedAt: number; latest: string | null } | null;
  write(entry: { checkedAt: number; latest: string | null }): void;
}

export class MemoryUpdateCache implements UpdateCache {
  private entry: { checkedAt: number; latest: string | null } | null = null;
  read(): { checkedAt: number; latest: string | null } | null {
    return this.entry;
  }
  write(entry: { checkedAt: number; latest: string | null }): void {
    this.entry = entry;
  }
}

/** Remembers the answer in a small file so that a command run many times asks once a day. */
export class FileUpdateCache implements UpdateCache {
  constructor(private readonly path: string) {}

  read(): { checkedAt: number; latest: string | null } | null {
    try {
      const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as { checkedAt?: unknown; latest?: unknown };
      if (typeof parsed.checkedAt !== 'number') {
        return null;
      }
      const latest = parsed.latest === null || parseVersion(parsed.latest) !== null ? (parsed.latest as string | null) : null;
      return { checkedAt: parsed.checkedAt, latest };
    } catch {
      return null;
    }
  }

  write(entry: { checkedAt: number; latest: string | null }): void {
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.tmp`;
      writeFileSync(temporary, JSON.stringify(entry), { encoding: 'utf8', mode: 0o600 });
      renameSync(temporary, this.path);
    } catch {
      // Not being able to remember only means asking again next time.
    }
  }
}

export interface CachedCheckOptions extends CheckOptions {
  cache: UpdateCache;
  now?: () => number;
  ttlMs?: number;
}

/**
 * The newer version, if there is one. The answer is reused for a day, including a "nothing
 * found", so that a failing network is not asked again on every command.
 */
export async function checkForUpdate(options: CachedCheckOptions): Promise<UpdateInfo | null> {
  const now = (options.now ?? Date.now)();
  const cached = options.cache.read();

  let latest: string | null;
  if (cached !== null && now - cached.checkedAt >= 0 && now - cached.checkedAt < (options.ttlMs ?? DAY_MS)) {
    latest = cached.latest;
  } else {
    latest = await fetchLatestVersion(options);
    options.cache.write({ checkedAt: now, latest });
  }

  if (latest === null || !isNewer(latest, options.current)) {
    return null;
  }
  return { current: options.current, latest, url: releaseUrl(latest) };
}
