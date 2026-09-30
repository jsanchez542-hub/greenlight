export interface ConnectEntry {
  connected: boolean;
  label: 'Connect' | 'Connected';
  detail: string | null;
  emphasized: boolean;
}

export function connectEntry(liveAvailable: boolean, host: string | null): ConnectEntry {
  if (liveAvailable) {
    return { connected: true, label: 'Connected', detail: host, emphasized: false };
  }
  return { connected: false, label: 'Connect', detail: 'not connected', emphasized: true };
}

interface HintState {
  skipped: boolean;
  dismissed: boolean;
  connected: boolean;
}

export function shouldShowConnectHint({ skipped, dismissed, connected }: HintState): boolean {
  return skipped && !dismissed && !connected;
}

export const CONNECT_HINT_TEXT = 'You can connect your n8n any time from here.';
