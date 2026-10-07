import { MemoryUpdateCache, VERSION, checkForUpdate, updateChecksEnabled, type UpdateCache } from 'greenlight';
import type { FailureCode } from '../failure';
import { EnvFileError, environmentProblem, type Environment } from './environment';
import type { RateLimiter } from './rate-limit';
import { saveSettings } from './settings-writer';
import { answer, isSetInProcess, readWriteRequest, refuse } from './write-request';

export const MAX_UPDATE_BODY_BYTES = 1024;

const SETTING = 'GREENLIGHT_CHECK_UPDATES';

export type UpdateAnswer =
  | { enabled: false; chosen: boolean }
  | { enabled: true; current: string; latest: string | null; url: string | null };

export interface UpdateDependencies {
  fetch?: typeof globalThis.fetch;
  cache?: UpdateCache;
  now?: () => number;
}

interface Shared {
  greenlightUpdateCache?: MemoryUpdateCache;
  greenlightUpdatePending?: Promise<UpdateAnswer>;
}

const shared = globalThis as typeof globalThis & Shared;

function sharedCache(): MemoryUpdateCache {
  shared.greenlightUpdateCache ??= new MemoryUpdateCache();
  return shared.greenlightUpdateCache;
}

async function ask(dependencies: UpdateDependencies): Promise<UpdateAnswer> {
  const info = await checkForUpdate({
    current: VERSION,
    cache: dependencies.cache ?? sharedCache(),
    ...(dependencies.fetch === undefined ? {} : { fetch: dependencies.fetch }),
    ...(dependencies.now === undefined ? {} : { now: dependencies.now }),
  }).catch(() => null);
  return { enabled: true, current: VERSION, latest: info?.latest ?? null, url: info?.url ?? null };
}

/**
 * What the dashboard knows about newer versions. When the notice is off this is a fixed answer
 * and nothing leaves the machine. When it is on, the only request is the one `checkForUpdate`
 * makes for the number of the latest release, at most once a day; nothing from the instance, the
 * settings or the visitor is part of it, and a failure simply means there is nothing to say.
 */
export async function readUpdates(env: Environment, dependencies: UpdateDependencies = {}): Promise<UpdateAnswer> {
  if (!updateChecksEnabled(env)) {
    return { enabled: false, chosen: (env[SETTING] ?? '').trim() !== '' };
  }
  if (dependencies.fetch !== undefined || dependencies.cache !== undefined) {
    return ask(dependencies);
  }
  shared.greenlightUpdatePending ??= ask(dependencies).finally(() => {
    shared.greenlightUpdatePending = undefined;
  });
  return shared.greenlightUpdatePending;
}

export interface UpdateChoiceContext {
  host: string | null;
  env: Environment;
  processEnv: Environment;
  filePath: string;
  limiter: RateLimiter;
  save?: typeof saveSettings;
}

function readChoice(value: unknown): boolean | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const choice = (value as Record<string, unknown>)['enabled'];
  return typeof choice === 'boolean' ? choice : null;
}

/**
 * Turns the notice on or off by writing the one setting that controls it. It is guarded like
 * every other request that writes, and it can only ever write that setting.
 */
export async function handleUpdateChoice(request: Request, context: UpdateChoiceContext): Promise<Response> {
  const received = await readWriteRequest(request, {
    host: context.host,
    env: context.env,
    limiter: context.limiter,
    maxBytes: MAX_UPDATE_BODY_BYTES,
  });
  if (!received.ok) {
    return received.response;
  }
  const enabled = readChoice(received.value);
  if (enabled === null) {
    return refuse('notUnderstood', 400);
  }

  try {
    await (context.save ?? saveSettings)(context.filePath, { [SETTING]: enabled ? '1' : '0' });
  } catch (error) {
    const code: FailureCode = error instanceof EnvFileError ? environmentProblem(error) : 'saveFailed';
    return refuse(code, error instanceof EnvFileError ? 409 : 500);
  }
  return answer({ enabled, notice: isSetInProcess(context.processEnv, [SETTING]) ? 'processEnv' : null });
}
