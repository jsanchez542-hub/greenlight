import { asBoolean, asRecord, asString } from './scan-result';

export const RELEASES_PREFIX = 'https://github.com/jsanchez542-hub/greenlight/releases/';
export const DISMISSED_UPDATE_KEY = 'greenlight.update-dismissed.v1';

const VERSION_PATTERN = /^\d{1,6}\.\d{1,6}\.\d{1,6}$/;

export type UpdateState =
  | { enabled: false; chosen: boolean }
  | { enabled: true; current: string; latest: string | null; url: string | null };

export interface UpdateNotice {
  latest: string;
  url: string;
}

function textOrNull(value: unknown, path: string): string | null {
  return value === null ? null : asString(value, path);
}

export function parseUpdateState(value: unknown): UpdateState {
  const fields = asRecord(value, 'the update answer');
  if (!asBoolean(fields['enabled'], 'enabled')) {
    return { enabled: false, chosen: fields['chosen'] === true };
  }
  return {
    enabled: true,
    current: asString(fields['current'], 'current'),
    latest: textOrNull(fields['latest'], 'latest'),
    url: textOrNull(fields['url'], 'url'),
  };
}

/**
 * The page of the release, if the address is exactly the one the number of the version leads to.
 * The address arrives from the server, which got the number from GitHub, so it is not trusted:
 * it is built again here from the number, and anything that differs is not shown as a link.
 */
export function releaseLink(latest: string, url: string): string | null {
  if (!VERSION_PATTERN.test(latest)) {
    return null;
  }
  const expected = `${RELEASES_PREFIX}tag/v${latest}`;
  return url === expected ? expected : null;
}

/** The notice to show, or null when there is nothing newer, the link is not the expected one or it was dismissed. */
export function updateNotice(state: UpdateState | null, dismissed: string | null): UpdateNotice | null {
  if (state === null || !state.enabled || state.latest === null || state.url === null) {
    return null;
  }
  const url = releaseLink(state.latest, state.url);
  if (url === null || dismissed === state.latest) {
    return null;
  }
  return { latest: state.latest, url };
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function readDismissedUpdate(storage: ReadableStorage | undefined): string | null {
  try {
    const stored = storage?.getItem(DISMISSED_UPDATE_KEY) ?? null;
    return stored !== null && VERSION_PATTERN.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function writeDismissedUpdate(storage: WritableStorage | undefined, version: string): void {
  if (!VERSION_PATTERN.test(version)) {
    return;
  }
  try {
    storage?.setItem(DISMISSED_UPDATE_KEY, version);
  } catch {
    return;
  }
}
