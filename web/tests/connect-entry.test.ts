import { describe, expect, it } from 'vitest';
import { connectEntry, shouldShowConnectHint } from '@/lib/connect-entry';
import { CONNECT_HINT_FLAG, WELCOME_SKIPPED_FLAG, WATCH_TIP_FLAG, WELCOME_FLAG } from '@/lib/stored-flag';

describe('connectEntry', () => {
  it('stands out and says so while no instance is connected', () => {
    expect(connectEntry(false, null)).toEqual({
      connected: false,
      label: 'Connect',
      detail: 'not connected',
      emphasized: true,
    });
  });

  it('reads Connected with the host once an instance is connected', () => {
    expect(connectEntry(true, 'n8n.example.com')).toEqual({
      connected: true,
      label: 'Connected',
      detail: 'n8n.example.com',
      emphasized: false,
    });
  });

  it('does not invent a host that the server has not sent yet', () => {
    expect(connectEntry(true, null).detail).toBeNull();
  });
});

describe('shouldShowConnectHint', () => {
  it('shows only to someone who skipped the welcome and has not dismissed the hint', () => {
    expect(shouldShowConnectHint({ skipped: true, dismissed: false, connected: false })).toBe(true);
  });

  it('never shows to someone who did not skip', () => {
    expect(shouldShowConnectHint({ skipped: false, dismissed: false, connected: false })).toBe(false);
  });

  it('shows once: dismissing it ends it', () => {
    expect(shouldShowConnectHint({ skipped: true, dismissed: true, connected: false })).toBe(false);
  });

  it('has no reason to show once an instance is connected', () => {
    expect(shouldShowConnectHint({ skipped: true, dismissed: false, connected: true })).toBe(false);
  });
});

describe('flag keys', () => {
  it('are distinct and versioned', () => {
    const keys = [WELCOME_FLAG, WATCH_TIP_FLAG, WELCOME_SKIPPED_FLAG, CONNECT_HINT_FLAG];
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(/\.v\d+$/);
    }
  });
});
