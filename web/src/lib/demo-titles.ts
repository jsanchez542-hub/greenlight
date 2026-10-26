import type { ScanResult } from 'greenlight';
import { describeFinding } from 'greenlight/i18n';
import type { Lang, Messages } from '@/i18n';
import { keyFindings } from './findings';
import { normalizePath } from './navigation';
import { routeKey } from './routes';

type ListedPage = keyof Messages['meta']['pages'];
export type DemoPage = ListedPage | 'notFound';

export interface DocumentTexts {
  title: string;
  description: string;
  standalone: boolean;
}

const SECTIONS: Record<string, [ListedPage, ListedPage]> = {
  findings: ['findings', 'finding'],
  workflows: ['workflows', 'workflow'],
  checks: ['checks', 'checks'],
  setup: ['setup', 'setup'],
};

function segmentsOf(pathname: string): string[] {
  return normalizePath(pathname).split('/').filter(Boolean);
}

export function pageOf(pathname: string): DemoPage {
  const [first, second] = segmentsOf(pathname);
  if (first === undefined) {
    return 'overview';
  }
  const entry = Object.hasOwn(SECTIONS, first) ? SECTIONS[first] : undefined;
  if (entry === undefined) {
    return 'notFound';
  }
  return second === undefined ? entry[0] : entry[1];
}

function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * The title and the description of a page of the demo, in the language of the reader. A workflow
 * is named by its name and a finding by its workflow and its check, so that a tab, a bookmark
 * or a shared link says which one it is. The install page already carries the name of the
 * product, so its title stands alone.
 */
export function demoDocument(pathname: string, result: ScanResult, t: Messages, lang: Lang): DocumentTexts {
  const page = pageOf(pathname);
  const detail = decoded(segmentsOf(pathname)[1] ?? '');

  if (page === 'notFound') {
    return { title: t.notFound.title, description: t.notFound.body, standalone: false };
  }
  if (page === 'setup') {
    return { title: t.demo.pageTitle, description: t.demo.pageDescription, standalone: true };
  }
  if (page === 'workflow') {
    const workflow = result.workflows.find(({ id }) => id === detail);
    if (workflow !== undefined) {
      const health = t.status.health[workflow.health];
      return { title: workflow.name, description: `${health.label}: ${health.meaning}`, standalone: false };
    }
  }
  if (page === 'finding') {
    const entry = keyFindings(result.findings).find(({ key }) => routeKey(key, true) === detail);
    if (entry !== undefined) {
      const { finding } = entry;
      const check = t.checks.detectors[finding.detector].label.toLowerCase();
      return { title: `${finding.workflowName}, ${check}`, description: describeFinding(finding, lang), standalone: false };
    }
  }
  return { ...t.meta.pages[page], standalone: false };
}

export function fullTitle(texts: DocumentTexts, t: Messages): string {
  return texts.standalone ? texts.title : `${texts.title} | ${t.meta.title}`;
}
