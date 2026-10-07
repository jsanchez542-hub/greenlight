import type { Messages } from '@/i18n';
import { STATIC_DEMO } from './demo';

export interface ConnectEntry {
  connected: boolean;
  host: string | null;
  emphasized: boolean;
}

export function connectEntry(liveAvailable: boolean, host: string | null): ConnectEntry {
  return { connected: liveAvailable, host: liveAvailable ? host : null, emphasized: !liveAvailable };
}

export interface ConnectTexts {
  label: string;
  detail: string | null;
  title: string;
}

/** The words of the entry that leads to the connection, or in the demo to how to install GreenLight. */
export function connectTexts(t: Messages, entry: ConnectEntry, demo: boolean = STATIC_DEMO): ConnectTexts {
  if (demo) {
    return { label: t.demo.entry, detail: t.demo.entryDetail, title: t.demo.entryTitle };
  }
  if (entry.connected) {
    return { label: t.sidebar.connected, detail: entry.host, title: t.sidebar.connectedTitle(entry.host) };
  }
  return { label: t.sidebar.connect, detail: t.sidebar.notConnected, title: t.sidebar.connectTitle };
}

interface HintState {
  skipped: boolean;
  dismissed: boolean;
  connected: boolean;
}

export function shouldShowConnectHint({ skipped, dismissed, connected }: HintState): boolean {
  return skipped && !dismissed && !connected;
}
