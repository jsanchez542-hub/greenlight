import type { ScanResult } from 'greenlight';
import type { LiveSnapshot } from '../live-snapshot';

const MINUTE_MS = 60_000;

export interface ScanCacheOptions {
  scan: () => Promise<ScanResult>;
  describeFailure: (error: unknown) => string;
  intervalMinutes: number;
  host: string | null;
  now?: () => number;
}

export class ScanCache {
  private result: ScanResult | null = null;
  private error: string | null = null;
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
