const PLAUSIBLE = /^\d{1,4}\.\d{1,4}\.\d{1,4}(?:-[0-9A-Za-z.-]{1,32})?$/;

export function versionLabel(version: string): string | null {
  return PLAUSIBLE.test(version) ? `GreenLight v${version}` : null;
}
