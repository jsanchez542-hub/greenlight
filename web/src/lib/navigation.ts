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

export function pageLabel(pathname: string, t: Messages): string {
  if (pathname === SETUP_HREF) {
    return t.nav.pages.setup;
  }
  const section = activeSection(pathname);
  return section === undefined ? t.nav.pages.notFound : t.nav.pages[section.id];
}

export function activeSection(pathname: string): Section | undefined {
  if (pathname === '/') {
    return sections[0];
  }
  return sections.find(
    (section) =>
      section.href !== '/' && (pathname === section.href || pathname.startsWith(`${section.href}/`)),
  );
}
