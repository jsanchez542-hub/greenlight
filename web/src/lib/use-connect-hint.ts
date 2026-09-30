'use client';

import { shouldShowConnectHint } from './connect-entry';
import { useScanControls } from './scan-context';
import { CONNECT_HINT_FLAG, WELCOME_SKIPPED_FLAG } from './stored-flag';
import { useStoredFlag } from './use-stored-flag';

export function useConnectHint() {
  const { liveAvailable } = useScanControls();
  const [skipped] = useStoredFlag(WELCOME_SKIPPED_FLAG);
  const [dismissed, dismiss] = useStoredFlag(CONNECT_HINT_FLAG);

  return { visible: shouldShowConnectHint({ skipped, dismissed, connected: liveAvailable }), dismiss };
}
