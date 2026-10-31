export const PACKAGE_NAME: string;
export const REPOSITORY_URL: string;

export interface PackReport {
  files: string[];
  size: number;
  unpackedSize: number;
}

export function checkPackage(pack: PackReport, manifest: Record<string, unknown>, cliStart: string): string[];
