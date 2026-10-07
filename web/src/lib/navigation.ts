import type { Messages } from '@/i18n';

export type SectionId = 'overview' | 'findings' | 'workflows' | 'checks';

export interface Section {
  id: SectionId;
  href: string;
  shortcut: string;
}

export const sections: readonly Section[] = [
  { id: 'overview', href: '/', shortcut: 'o' },
  { id: 'findings', href: '/findings', shortcut: 'f' },
  { id: 'workflows', href: '/workflows', shortcut: 'w' },
  { id: 'checks', href: '/checks', shortcut: 'c' },
];

export const SETUP_HREF = '/setup';

/** A path without the slash that a host serving folders puts at its end, so '/setup/' and '/setup' are one page. */
export function normalizePath(pathname: string): string {
  let end = pathname.length;
  while (end > 1 && pathname.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return pathname.slice(0, end);
}

export function pageLabel(rawPath: string, t: Messages): string {
  const pathname = normalizePath(rawPath);
  if (pathname === SETUP_HREF) {
    return t.nav.pages.setup;
  }
  const section = activeSection(pathname);
  return section === undefined ? t.nav.pages.notFound : t.nav.pages[section.id];
}

export function activeSection(rawPath: string): Section | undefined {
  const pathname = normalizePath(rawPath);
  if (pathname === '/') {
    return sections[0];
  }
  return sections.find(
    (section) =>
      section.href !== '/' && (pathname === section.href || pathname.startsWith(`${section.href}/`)),
  );
}
