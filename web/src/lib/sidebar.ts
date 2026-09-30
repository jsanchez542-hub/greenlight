export type SidebarState = 'expanded' | 'collapsed';

export const SIDEBAR_STORAGE_KEY = 'greenlight.sidebar';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function parseSidebarState(raw: string | null): SidebarState {
  return raw === 'collapsed' ? 'collapsed' : 'expanded';
}

export function toggledSidebar(state: SidebarState): SidebarState {
  return state === 'expanded' ? 'collapsed' : 'expanded';
}

export function readSidebarState(storage: ReadableStorage | undefined): SidebarState {
  try {
    return parseSidebarState(storage?.getItem(SIDEBAR_STORAGE_KEY) ?? null);
  } catch {
    return 'expanded';
  }
}

export function writeSidebarState(storage: WritableStorage | undefined, state: SidebarState): void {
  try {
    storage?.setItem(SIDEBAR_STORAGE_KEY, state);
  } catch {
    return;
  }
}
