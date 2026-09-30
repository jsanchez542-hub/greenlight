export const WELCOME_FLAG = 'greenlight.welcome.v1';
export const WATCH_TIP_FLAG = 'greenlight.watch-tip.v1';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function readFlag(storage: ReadableStorage | undefined, key: string): boolean {
  try {
    return storage?.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeFlag(storage: WritableStorage | undefined, key: string): void {
  try {
    storage?.setItem(key, '1');
  } catch {
    return;
  }
}
