import { describe, expect, it } from 'vitest';
import { DEFAULT_CONCURRENCY, MAX_CONCURRENCY, isValidConcurrency, mapWithLimit } from '../src/concurrency.js';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Lets other tasks run for a few turns without waiting on a real clock. */
async function pause(turns: number): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) {
    await Promise.resolve();
  }
}

describe('isValidConcurrency', () => {
  it('accepts whole numbers from 1 to the maximum', () => {
    expect(isValidConcurrency(1)).toBe(true);
    expect(isValidConcurrency(DEFAULT_CONCURRENCY)).toBe(true);
    expect(isValidConcurrency(MAX_CONCURRENCY)).toBe(true);
  });

  it('refuses anything else, including values that are not numbers at all', () => {
    for (const value of [0, -1, 1.5, MAX_CONCURRENCY + 1, Number.NaN, Number.POSITIVE_INFINITY, '4' as never]) {
      expect(isValidConcurrency(value)).toBe(false);
    }
  });
});

describe('mapWithLimit', () => {
  it('returns the results in the order of the items, whatever order they finish in', async () => {
    const gates = [deferred(), deferred(), deferred()];
    const finished: number[] = [];

    const run = mapWithLimit(['a', 'b', 'c'], 3, async (item, index) => {
      await gates[index]?.promise;
      finished.push(index);
      return item.toUpperCase();
    });
    gates[2]?.resolve();
    gates[0]?.resolve();
    gates[1]?.resolve();

    expect(await run).toEqual(['A', 'B', 'C']);
    expect(finished).toEqual([2, 0, 1]);
  });

  it('never runs more at once than the limit, and does reach it', async () => {
    let running = 0;
    let peak = 0;

    await mapWithLimit(Array.from({ length: 20 }, (_, index) => index), 3, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await pause(3);
      running -= 1;
    });

    expect(peak).toBe(3);
  });

  it('does not start more tasks than there are items', async () => {
    let running = 0;
    let peak = 0;

    await mapWithLimit([1, 2], 8, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await pause(3);
      running -= 1;
    });

    expect(peak).toBe(2);
  });

  it('handles an empty list', async () => {
    await expect(mapWithLimit([], 4, async () => 1)).resolves.toEqual([]);
  });

  it('with a limit of 1 starts the items one after another, in order', async () => {
    const started: number[] = [];
    let running = 0;

    await mapWithLimit([0, 1, 2, 3], 1, async (item) => {
      expect(running).toBe(0);
      running += 1;
      started.push(item);
      await pause(3);
      running -= 1;
    });

    expect(started).toEqual([0, 1, 2, 3]);
  });

  it('starts nothing new after a failure and lets the running tasks finish', async () => {
    const started: number[] = [];
    const slow = deferred();

    const run = mapWithLimit([0, 1, 2, 3, 4, 5], 2, async (item) => {
      started.push(item);
      if (item === 0) {
        throw new Error('first item failed');
      }
      await slow.promise;
    });
    const outcome = expect(run).rejects.toThrow('first item failed');
    slow.resolve();
    await outcome;

    expect(started).toEqual([0, 1]);
  });

  it('reports the failure of the earliest item when several fail', async () => {
    const late = deferred();
    const early = deferred();

    const run = mapWithLimit([0, 1], 2, async (item) => {
      await (item === 0 ? late : early).promise;
      throw new Error(`item ${item} failed`);
    });
    const outcome = expect(run).rejects.toThrow('item 0 failed');
    early.resolve();
    late.resolve();
    await outcome;
  });
});
