export interface RateLimitOptions {
  minGapMs: number;
  maxPerWindow: number;
  windowMs: number;
  now?: () => number;
}

export type RateVerdict = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Limits how often something may be attempted: a minimum gap between attempts and a maximum
 * number inside a sliding window. Refused attempts are not counted, so waiting is enough.
 */
export class RateLimiter {
  private readonly attempts: number[] = [];

  constructor(private readonly options: RateLimitOptions) {}

  check(): RateVerdict {
    const now = (this.options.now ?? Date.now)();
    while (this.attempts.length > 0 && now - (this.attempts[0] ?? now) >= this.options.windowMs) {
      this.attempts.shift();
    }

    const last = this.attempts.at(-1);
    const gapWait = last === undefined ? 0 : this.options.minGapMs - (now - last);
    const first = this.attempts[0];
    const windowWait =
      this.attempts.length >= this.options.maxPerWindow && first !== undefined
        ? this.options.windowMs - (now - first)
        : 0;

    const wait = Math.max(gapWait, windowWait);
    if (wait > 0) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(wait / 1000)) };
    }
    this.attempts.push(now);
    return { allowed: true };
  }
}
