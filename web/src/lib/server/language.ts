import { cookies, headers } from 'next/headers';
import { messagesFor, type Lang, type Messages } from '@/i18n';
import { resolveLanguage } from '@/i18n/resolve';
import { FLAG_COOKIE_NAME, languageFromCookieValue } from '../flag-cookie';
import { currentEnvironment } from './environment';

function configuredLanguage(): string | undefined {
  try {
    return currentEnvironment()['GREENLIGHT_LANG'];
  } catch {
    return undefined;
  }
}

/** The language of this request: the person's choice, the installation's setting, the browser's. */
export async function currentLanguage(): Promise<Lang> {
  const [jar, incoming] = await Promise.all([cookies(), headers()]);
  return resolveLanguage({
    cookie: languageFromCookieValue(jar.get(FLAG_COOKIE_NAME)?.value),
    setting: configuredLanguage(),
    acceptLanguage: incoming.get('accept-language'),
  });
}

export async function currentMessages(): Promise<Messages> {
  return messagesFor(await currentLanguage());
}
