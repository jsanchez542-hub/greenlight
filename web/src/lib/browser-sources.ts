import { STATIC_DEMO } from './demo';
import type { FlagSources } from './stored-flag';

export function browserSources(): FlagSources {
  return {
    get storage() {
      try {
        return window.localStorage;
      } catch {
        return undefined;
      }
    },
    readCookies: () => (STATIC_DEMO ? '' : document.cookie),
    writeCookie: (cookie) => {
      if (!STATIC_DEMO) {
        document.cookie = cookie;
      }
    },
  };
}
