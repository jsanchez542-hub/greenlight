import { en } from '@/i18n/en';
import type { Messages } from '@/i18n';

export type FailureCode = keyof Messages['failures'];

export function parseFailureCode(value: unknown): FailureCode | null {
  return typeof value === 'string' && Object.hasOwn(en.failures, value) ? (value as FailureCode) : null;
}

export class ApiFailure extends Error {
  constructor(
    readonly code: FailureCode,
    readonly seconds: number | null = null,
  ) {
    super(code);
    this.name = 'ApiFailure';
  }
}

export function failureText(code: FailureCode, t: Messages, seconds: number | null = null): string {
  const entry = t.failures[code];
  return typeof entry === 'function' ? entry(seconds ?? 1) : entry;
}

export function failureCodeOf(error: unknown): FailureCode {
  return error instanceof ApiFailure ? error.code : 'invalidAnswer';
}
