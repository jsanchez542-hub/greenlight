/**
 * The most workflows read at the same time. Past this a larger pool stops being faster for
 * the reader and only adds load to an instance that is also running someone's automations.
 */
export const MAX_CONCURRENCY = 16;

/** What the command line and the dashboard use when nothing is set. */
export const DEFAULT_CONCURRENCY = 4;

export function isValidConcurrency(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_CONCURRENCY;
}

interface Failure {
  index: number;
  error: unknown;
}

/**
 * Runs `task` over `items` with at most `limit` running at once and returns the results in the
 * order of `items`, whatever order they finish in.
 *
 * After the first failure nothing new starts and the tasks already running are left to finish.
 * The failure thrown is the one of the earliest item, so a problem that hits every item, such
 * as a revoked key, reports the same error as it would if the items were handled one by one.
 */
export async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const state: { next: number; failure: Failure | undefined } = { next: 0, failure: undefined };

  function fail(index: number, error: unknown): void {
    if (state.failure === undefined || index < state.failure.index) {
      state.failure = { index, error };
    }
  }

  async function work(): Promise<void> {
    while (state.failure === undefined && state.next < items.length) {
      const index = state.next++;
      try {
        results[index] = await task(items[index] as T, index);
      } catch (error) {
        fail(index, error);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, work));

  if (state.failure !== undefined) {
    throw state.failure.error;
  }
  return results;
}
