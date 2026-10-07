import type { ScanResult } from 'greenlight';
import type { FailureCode } from '../failure';
import type { LiveSnapshot } from '../live-snapshot';

const MINUTE_MS = 60_000;

export const FORCED_REFRESH_COOLDOWN_MS = 30_000;

export interface ScanCacheOptions {
  scan: () => Promise<ScanResult>;
  describeFailure: (error: unknown) => FailureCode;
  intervalMinutes: number;
  host: string | null;
  cooldownMs?: number;
  now?: () => number;
}

export interface RefreshOutcome {
  accepted: boolean;
  retryAfterSeconds: number;
}

export class ScanCache {
  private result: ScanResult | null = null;
  private error: FailureCode | null = null;
  private lastAttemptAt: number | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(private readonly options: ScanCacheOptions) {}

  snapshot(): LiveSnapshot {
    if (this.isDue()) {
      void this.refresh();
    }
    return {
      result: this.result,
      error: this.error,
      refreshing: this.inFlight !== null,
      intervalMinutes: this.options.intervalMinutes,
      host: this.options.host,
    };
  }

  refresh(): Promise<void> {
    this.inFlight ??= this.run().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /**
   * A manual refresh joins a scan that is already running, and otherwise waits out a
   * cooldown after the last one, so repeated requests cannot hammer the instance.
   */
  forceRefresh(): RefreshOutcome {
    if (this.inFlight !== null) {
      return { accepted: true, retryAfterSeconds: 0 };
    }
    const cooldown = this.options.cooldownMs ?? FORCED_REFRESH_COOLDOWN_MS;
    const sinceLast = this.lastAttemptAt === null ? Infinity : this.clock() - this.lastAttemptAt;
    if (sinceLast < cooldown) {
      return { accepted: false, retryAfterSeconds: Math.ceil((cooldown - sinceLast) / 1000) };
    }
    void this.refresh();
    return { accepted: true, retryAfterSeconds: 0 };
  }

  private isDue(): boolean {
    if (this.inFlight !== null) {
      return false;
    }
    return (
      this.lastAttemptAt === null ||
      this.clock() - this.lastAttemptAt >= this.options.intervalMinutes * MINUTE_MS
    );
  }

  private clock(): number {
    return (this.options.now ?? Date.now)();
  }

  private async run(): Promise<void> {
    this.lastAttemptAt = this.clock();
    try {
      this.result = await this.options.scan();
      this.error = null;
    } catch (error) {
      this.error = this.options.describeFailure(error);
    }
  }
}
