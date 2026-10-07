export interface ConnectEntry {
  connected: boolean;
  host: string | null;
  emphasized: boolean;
}

export function connectEntry(liveAvailable: boolean, host: string | null): ConnectEntry {
  return { connected: liveAvailable, host: liveAvailable ? host : null, emphasized: !liveAvailable };
}

interface HintState {
  skipped: boolean;
  dismissed: boolean;
  connected: boolean;
}

export function shouldShowConnectHint({ skipped, dismissed, connected }: HintState): boolean {
  return skipped && !dismissed && !connected;
}
