import { en, type Messages } from './en.js';
import { es } from './es.js';
import type { Lang } from './lang.js';

export { DEFAULT_LANG, languages, parseLang, resolveLang, type Lang } from './lang.js';
export { describeFinding, evidenceLabel, evidenceValue } from './findings.js';
export type { Messages } from './en.js';

const catalogues: Record<Lang, Messages> = { en, es };

export function messagesFor(lang: Lang): Messages {
  return catalogues[lang];
}
