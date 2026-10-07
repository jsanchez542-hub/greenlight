import { DEFAULT_LANG, languages, parseLang, type Lang } from 'greenlight/i18n';
import { en, type Messages } from './en';
import { es } from './es';

export { DEFAULT_LANG, languages, parseLang, type Lang, type Messages };

const catalogues: Record<Lang, Messages> = { en, es };

export function messagesFor(lang: Lang): Messages {
  return catalogues[lang];
}
