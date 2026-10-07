import type { DetectorName, Finding } from '../analysis/types.js';
import type { Lang } from './lang.js';

/**
 * Findings are produced once, in English, and that text is part of the scan result other
 * programs read. What a person reads in another language is written here from the same
 * numbers, so both versions always say the same thing.
 */

type Evidence = Finding['evidence'];

const evidenceLabels: Record<Lang, Record<string, string>> = {
  en: {
    node: 'Node',
    executionsWithError: 'Executions with an error',
    executionsInspected: 'Executions inspected',
    baselineMedian: 'Usual median time',
    baselineP95: 'Usual 95th percentile',
    recentMedian: 'Recent median time',
    slowdown: 'Slower by',
    baselineSamples: 'Runs in the history',
    recentSamples: 'Recent runs',
    lastRunAt: 'Last run',
    silentFor: 'Quiet for',
    usualInterval: 'Usual interval',
    recentRuns: 'Runs in the window',
    expectedRuns: 'Runs expected',
    windowHours: 'Window (hours)',
    baselineRuns: 'Runs in the history',
  },
  es: {
    node: 'Nodo',
    executionsWithError: 'Ejecuciones con error',
    executionsInspected: 'Ejecuciones revisadas',
    baselineMedian: 'Tiempo mediano habitual',
    baselineP95: 'Percentil 95 habitual',
    recentMedian: 'Tiempo mediano reciente',
    slowdown: 'Veces más lento',
    baselineSamples: 'Ejecuciones en el historial',
    recentSamples: 'Ejecuciones recientes',
    lastRunAt: 'Última ejecución',
    silentFor: 'Sin ejecutarse desde hace',
    usualInterval: 'Intervalo habitual',
    recentRuns: 'Ejecuciones en la ventana',
    expectedRuns: 'Ejecuciones esperadas',
    windowHours: 'Ventana (horas)',
    baselineRuns: 'Ejecuciones en el historial',
  },
};

/** A readable name for an evidence key; an unknown key is shown as it is rather than hidden. */
export function evidenceLabel(key: string, lang: Lang): string {
  const labels = evidenceLabels[lang];
  return Object.hasOwn(labels, key) ? (labels[key] as string) : key;
}

const durationKeys = new Set(['baselineMedian', 'baselineP95', 'recentMedian', 'slowdown', 'silentFor', 'usualInterval']);

/**
 * Durations are written by the detectors in a fixed English form: "12.3s", "45 min", "5.1 h",
 * "3.2 days". In Spanish the decimal separator is a comma and "days" is "días".
 */
export function evidenceValue(key: string, value: string | number, lang: Lang): string {
  if (lang === 'en') {
    return String(value);
  }
  const text = String(value);
  if (!durationKeys.has(key)) {
    return text;
  }
  return text
    .replace(/(\d)\.(\d)/g, '$1,$2')
    .replace(/(\d)s$/, '$1 s')
    .replace(/days$/, 'días');
}

function text(evidence: Evidence, key: string): string | null {
  const value = evidence[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

function count(evidence: Evidence, key: string): number | null {
  const value = evidence[key];
  return typeof value === 'number' ? value : null;
}

const spanish: Record<DetectorName, (finding: Finding) => string | null> = {
  'silent-error': ({ evidence }) => {
    const node = text(evidence, 'node');
    const failed = count(evidence, 'executionsWithError');
    const inspected = count(evidence, 'executionsInspected');
    if (node === null || failed === null || inspected === null) {
      return null;
    }
    const subject =
      inspected === 1 ? 'la última ejecución correcta' : `las últimas ${inspected} ejecuciones correctas`;
    return `“${node}” devolvió un error en ${failed} de ${subject}. El workflow indica que todo fue bien mientras este paso falla.`;
  },
  'duration-drift': ({ evidence }) => {
    const before = text(evidence, 'baselineMedian');
    const after = text(evidence, 'recentMedian');
    const slowdown = text(evidence, 'slowdown');
    if (before === null || after === null || slowdown === null) {
      return null;
    }
    return `El tiempo habitual de ejecución subió de ${evidenceValue('baselineMedian', before, 'es')} a ${evidenceValue('recentMedian', after, 'es')}, es decir, ${evidenceValue('slowdown', slowdown.replace(/x$/, ''), 'es')} veces más lento que antes. Suele indicar que un servicio externo está reintentando antes de rendirse.`;
  },
  silence: ({ evidence }) => {
    const quiet = text(evidence, 'silentFor');
    const usual = text(evidence, 'usualInterval');
    if (quiet === null || usual === null) {
      return null;
    }
    return `El workflow activo no se ejecuta desde hace ${evidenceValue('silentFor', quiet, 'es')}, cuando lo normal es que lo haga cada ${evidenceValue('usualInterval', usual, 'es')}. Lo más probable es que su disparador ya no esté registrado.`;
  },
  'frequency-drop': ({ evidence }) => {
    const recent = count(evidence, 'recentRuns');
    const expected = count(evidence, 'expectedRuns');
    const window = count(evidence, 'windowHours');
    if (recent === null || expected === null || window === null) {
      return null;
    }
    return `Se ejecutó ${recent === 1 ? '1 vez' : `${recent} veces`} en las últimas ${window} h, cuando se esperaban unas ${expected}. Es probable que alguien haya editado la programación.`;
  },
};

/**
 * The sentence that explains a finding, in the language asked for. If the evidence needed for the
 * Spanish sentence is missing, for example in a result saved by an older version, the original
 * English sentence is returned instead of a half-built one.
 */
export function describeFinding(finding: Finding, lang: Lang): string {
  if (lang === 'en') {
    return finding.summary;
  }
  return spanish[finding.detector](finding) ?? finding.summary;
}
