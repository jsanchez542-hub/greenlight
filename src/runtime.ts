import { messagesFor, type Lang } from './i18n/index.js';

/** The oldest Node.js GreenLight runs on: the one that can read a .env file itself. */
export const MINIMUM_NODE = { major: 22, minor: 12 } as const;

export function nodeVersionProblem(version: string, lang: Lang = 'en'): string | null {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  const supported = major > MINIMUM_NODE.major || (major === MINIMUM_NODE.major && minor >= MINIMUM_NODE.minor);
  if (supported) {
    return null;
  }
  return messagesFor(lang).runtime.nodeTooOld(`${MINIMUM_NODE.major}.${MINIMUM_NODE.minor}`, version);
}
