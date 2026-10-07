import type { Finding, Severity } from './analysis/types.js';
import { describeFinding, evidenceLabel, evidenceValue, messagesFor, type Lang } from './i18n/index.js';
import type { ScanResult } from './scan.js';

const palette = {
  reset: '\u001B[0m',
  dim: '\u001B[2m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  green: '\u001B[32m',
};

type Paint = (text: string, colour: keyof typeof palette) => string;

const plain: Paint = (text) => text;
const coloured: Paint = (text, colour) => `${palette[colour]}${text}${palette.reset}`;

const severityColour: Record<Severity, keyof typeof palette> = {
  critical: 'red',
  warning: 'yellow',
};

function wrap(text: string, width: number, indent: string): string[] {
  const lines: string[] = [];
  let current = '';

  for (const word of text.split(' ')) {
    if (current.length + word.length + 1 > width) {
      lines.push(indent + current);
      current = word;
    } else {
      current = current === '' ? word : `${current} ${word}`;
    }
  }
  if (current !== '') {
    lines.push(indent + current);
  }
  return lines;
}

function renderFinding(finding: Finding, paint: Paint, lang: Lang): string[] {
  const names = messagesFor(lang).report.severity;
  const labelWidth = Math.max(names.critical.length, names.warning.length) + 1;
  const label = paint(names[finding.severity].padEnd(labelWidth - 1), severityColour[finding.severity]);
  const lines = [`${label} ${finding.workflowName}`, ...wrap(describeFinding(finding, lang), 72, ' '.repeat(labelWidth))];

  // English keeps the keys as the scan result names them; Spanish reads as words.
  const shown = Object.entries(finding.evidence).map(([key, value]) => ({
    name: lang === 'en' ? key : evidenceLabel(key, lang),
    value: evidenceValue(key, value, lang),
  }));
  const width = Math.max(...shown.map(({ name }) => name.length));
  for (const { name, value } of shown) {
    lines.push(paint(`${' '.repeat(labelWidth + 4)}${name.padEnd(width)}  ${value}`, 'dim'));
  }

  return lines;
}

export function renderReport(result: ScanResult, useColour: boolean, lang: Lang = 'en'): string {
  const paint = useColour ? coloured : plain;
  const { findings, workflowsScanned } = result;
  const t = messagesFor(lang).report;

  if (findings.length === 0) {
    return `GreenLight  ${t.scanned(workflowsScanned)}  ${paint(t.nothing, 'green')}\n`;
  }

  const critical = findings.filter((finding) => finding.severity === 'critical').length;

  return [
    `GreenLight  ${t.scanned(workflowsScanned)}  ${t.summary(findings.length, critical)}`,
    '',
    ...findings.flatMap((finding) => [...renderFinding(finding, paint, lang), '']),
  ].join('\n');
}
