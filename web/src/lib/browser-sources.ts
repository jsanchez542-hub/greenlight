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
    readCookies: () => document.cookie,
    writeCookie: (cookie) => {
      document.cookie = cookie;
    },
  };
}
