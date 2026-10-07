import { DEFAULT_LANG, parseLang, type Lang } from '@/i18n';

export const DEMO_LANGUAGE_KEY = 'greenlight.lang.v1';

/**
 * The language of a page that has no server to ask: what the visitor chose before, then the
 * first language of the browser that GreenLight speaks, then English.
 */
export function chooseLanguage(stored: string | null, preferred: readonly string[]): Lang {
  const remembered = stored === 'en' || stored === 'es' ? stored : null;
  if (remembered !== null) {
    return remembered;
  }
  for (const tag of preferred) {
    const found = parseLang(tag);
    if (found !== null) {
      return found;
    }
  }
  return DEFAULT_LANG;
}

/**
 * Runs in the head before the first paint, so the page can say what language it will be in. The
 * pages are built in English; for anyone else the body stays hidden until the page has switched,
 * with a timer that shows it anyway, so that a failure of the script can never leave a blank page.
 * It repeats `chooseLanguage` in a form that needs no build step, and a test keeps the two equal.
 */
export const LANGUAGE_INIT_SCRIPT = `try{var d=document.documentElement,s=localStorage.getItem(${JSON.stringify(DEMO_LANGUAGE_KEY)}),c=s==="en"||s==="es"?s:null,l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language];for(var i=0;!c&&i<l.length;i++){var p=String(l[i]).trim().toLowerCase().split(/[-_.@:]/)[0];if(p==="en"||p==="es")c=p}c=c||"en";d.lang=c;if(c!=="en"){d.setAttribute("data-pending","1");setTimeout(function(){d.removeAttribute("data-pending")},3000)}}catch(e){}`;

const listeners = new Set<() => void>();
let current: Lang | null = null;

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function resolve(): Lang {
  let stored: string | null = null;
  try {
    stored = storage()?.getItem(DEMO_LANGUAGE_KEY) ?? null;
  } catch {
    stored = null;
  }
  return chooseLanguage(stored, navigator.languages.length > 0 ? navigator.languages : [navigator.language]);
}

export function subscribeToDemoLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function demoLanguageSnapshot(): Lang {
  current ??= resolve();
  return current;
}

export function demoLanguageOnTheServer(): Lang {
  return DEFAULT_LANG;
}

export function chooseDemoLanguage(lang: Lang): void {
  try {
    storage()?.setItem(DEMO_LANGUAGE_KEY, lang);
  } catch {
    // The choice then lasts only until the page is closed.
  }
  current = lang;
  listeners.forEach((listener) => listener());
}
