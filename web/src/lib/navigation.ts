export type SectionId = 'overview' | 'findings' | 'workflows' | 'checks';

export interface Section {
  id: SectionId;
  href: string;
  label: string;
  shortcut: string;
}

export const sections: readonly Section[] = [
  { id: 'overview', href: '/', label: 'Overview', shortcut: 'o' },
  { id: 'findings', href: '/findings', label: 'Findings', shortcut: 'f' },
  { id: 'workflows', href: '/workflows', label: 'Workflows', shortcut: 'w' },
  { id: 'checks', href: '/checks', label: 'Checks', shortcut: 'c' },
];

export const SETUP_HREF = '/setup';

export function pageLabel(pathname: string): string {
  if (pathname === SETUP_HREF) {
    return 'setup';
  }
  return activeSection(pathname)?.label.toLowerCase() ?? 'not found';
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
