import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { messagesFor, type Lang } from '../i18n/index.js';
import type { FindingTracker } from './findings.js';

export const STATE_VERSION = 1;

export interface WatchState {
  version: typeof STATE_VERSION;
  tracker: FindingTracker;
  consecutiveFailures: number;
  degraded: boolean;
}

export interface StateStore {
  load(): WatchState;
  save(state: WatchState): void;
}

export function emptyState(): WatchState {
  return { version: STATE_VERSION, tracker: {}, consecutiveFailures: 0, degraded: false };
}

function isState(value: unknown): value is WatchState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<WatchState>;
  return (
    candidate.version === STATE_VERSION &&
    typeof candidate.tracker === 'object' &&
    candidate.tracker !== null &&
    typeof candidate.consecutiveFailures === 'number' &&
    typeof candidate.degraded === 'boolean'
  );
}

/**
 * Keeps the state in one JSON file so a restart does not repeat alerts already sent.
 * An unreadable file is treated as no history rather than stopping the watcher.
 */
export class FileStateStore implements StateStore {
  constructor(
    private readonly path: string,
    private readonly warn: (message: string) => void,
    private readonly lang: Lang = 'en',
  ) {}

  load(): WatchState {
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.warn(messagesFor(this.lang).watch.stateUnreadable(this.path));
      }
      return emptyState();
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (isState(parsed)) {
        return parsed;
      }
    } catch {
      // falls through to the warning below
    }
    this.warn(messagesFor(this.lang).watch.stateForeign(this.path));
    return emptyState();
  }

  save(state: WatchState): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, this.path);
  }
}
