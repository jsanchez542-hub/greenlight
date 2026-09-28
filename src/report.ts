import type { Finding, Severity } from './analysis/types.js';
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

function renderFinding(finding: Finding, paint: Paint): string[] {
  const label = paint(finding.severity.toUpperCase().padEnd(8), severityColour[finding.severity]);
  const lines = [`${label} ${finding.workflowName}`, ...wrap(finding.summary, 72, '         ')];

  const width = Math.max(...Object.keys(finding.evidence).map((key) => key.length));
  for (const [key, value] of Object.entries(finding.evidence)) {
    lines.push(paint(`             ${key.padEnd(width)}  ${value}`, 'dim'));
  }

  return lines;
}

export function renderReport(result: ScanResult, useColour: boolean): string {
  const paint = useColour ? coloured : plain;
  const { findings, workflowsScanned } = result;

  if (findings.length === 0) {
    return `GreenLight  scanned ${workflowsScanned} workflows  ${paint('nothing to report', 'green')}\n`;
  }

  const critical = findings.filter((finding) => finding.severity === 'critical').length;
  const summary = `${findings.length} finding${findings.length === 1 ? '' : 's'}, ${critical} critical`;

  return [
    `GreenLight  scanned ${workflowsScanned} workflows  ${summary}`,
    '',
    ...findings.flatMap((finding) => [...renderFinding(finding, paint), '']),
  ].join('\n');
}
