import type { Finding } from 'greenlight';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FindingRow } from '@/components/findings/FindingRow';
import { LanguageSwitch } from '@/components/shell/LanguageSwitch';
import { VersionNote } from '@/components/shell/VersionNote';
import { CheckFacts } from '@/components/ui/CheckFacts';
import { CopyButton } from '@/components/ui/CopyButton';
import { EvidenceList } from '@/components/ui/EvidenceList';
import { NotInScan, ScanFailure } from '@/components/ui/Notice';
import { LanguageProvider } from '@/i18n/context';
import type { Lang } from '@/i18n';
import { parseFailureCode } from '@/lib/failure';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/',
}));

function render(lang: Lang, element: ReactElement): string {
  return renderToStaticMarkup(LanguageProvider({ lang, children: element }));
}

const finding: Finding = {
  workflowId: 'w1',
  workflowName: 'Order confirmations',
  detector: 'silent-error',
  severity: 'critical',
  summary: '"Send receipt" emitted an error in 5 of the last 5 successful executions.',
  evidence: { node: 'Send receipt', executionsWithError: 5, executionsInspected: 5 },
};

describe('what a Spanish reader sees', () => {
  it('reads the finding in Spanish and keeps the names of the workflow and the node as they are', () => {
    const markup = render('es', createElement(FindingRow, { entry: { key: 'k', finding } }));
    expect(markup).toContain('Crítico');
    expect(markup).toContain('Error silencioso');
    expect(markup).toContain('devolvió un error en 5 de las últimas 5 ejecuciones correctas');
    expect(markup).toContain('Order confirmations');
    expect(markup).toContain('Send receipt');
    expect(markup).not.toContain('emitted an error');
  });

  it('keeps the English sentence of the scan for an English reader', () => {
    const markup = render('en', createElement(FindingRow, { entry: { key: 'k', finding } }));
    expect(markup).toContain('emitted an error');
    expect(markup).toContain('Critical');
  });

  it('names the evidence in words, in both languages', () => {
    const evidence = { node: 'Send receipt', executionsWithError: 5, recentMedian: '12.3s', silentFor: '3.2days' };
    const spanish = render('es', createElement(EvidenceList, { evidence }));
    expect(spanish).toContain('Nodo');
    expect(spanish).toContain('Ejecuciones con error');
    expect(spanish).toContain('12,3 s');
    expect(spanish).toContain('3,2días');
    expect(spanish).not.toContain('executionsWithError');

    const english = render('en', createElement(EvidenceList, { evidence }));
    expect(english).toContain('Executions with an error');
    expect(english).toContain('12.3s');
  });

  it('shows an evidence key it does not know, or one named like an object property, as plain text', () => {
    const evidence = { constructor: 'x', __proto__: 'y', toString: 'z', unknownKey: 'value' };
    const markup = render('es', createElement(EvidenceList, { evidence: JSON.parse(JSON.stringify(evidence)) }));
    expect(markup).toContain('unknownKey');
    expect(markup).toContain('value');
  });

  it('writes the checks page text in Spanish', () => {
    const markup = render('es', createElement(CheckFacts, { detector: 'silence' }));
    expect(markup).toContain('Pregunta');
    expect(markup).toContain('Cómo decide');
    expect(markup).toContain('Qué revisar');
    expect(markup).toContain('más de 4 veces el intervalo habitual');
  });

  it('writes the failure and the missing page in Spanish', () => {
    const failure = render('es', createElement(ScanFailure, { problem: 'scanRejectedKey', onRetry: () => undefined, onShowSample: () => undefined }));
    expect(failure).toContain('El análisis no terminó');
    expect(failure).toContain('la instancia rechazó la clave de API');

    const missing = render('es', createElement(NotInScan, { kind: 'finding', backHref: '/findings' }));
    expect(missing).toContain('Este hallazgo no existe');
    expect(missing).toContain('Volver a hallazgos');
  });

  it('never prints text from the server, only the wording of the page for a code', () => {
    expect(parseFailureCode('<script>alert(1)</script>')).toBeNull();
    expect(parseFailureCode('constructor')).toBeNull();
    expect(parseFailureCode('__proto__')).toBeNull();
    expect(parseFailureCode('hostNotAllowed')).toBe('hostNotAllowed');
  });

  it('labels the copy button in Spanish', () => {
    const markup = render('es', createElement(CopyButton, { text: 'npm run setup', label: 'el comando' }));
    expect(markup).toContain('Copiar el comando');
  });

  it('offers both languages by their own names and marks the current one', () => {
    const markup = render('es', createElement(LanguageSwitch, { placement: 'sidebar' }));
    expect(markup).toContain('aria-label="Language / Idioma"');
    expect(markup).toMatch(/<button[^>]*lang="es"[^>]*aria-pressed="true"[^>]*aria-label="Español"/);
    expect(markup).toMatch(/<button[^>]*lang="en"[^>]*aria-pressed="false"[^>]*aria-label="English"/);
    expect(markup.indexOf('>ES<')).toBeLessThan(markup.indexOf('>EN<'));
  });

  it('keeps the version note the same in both languages', () => {
    expect(render('es', createElement(VersionNote, { version: '1.0.0', placement: 'sidebar' }))).toContain('GreenLight v1.0.0');
  });
});
