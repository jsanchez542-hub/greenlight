import { createServer } from 'node:net';

/** Finds the address the dashboard announces when it starts, such as http://127.0.0.1:3000. */
export function findLocalUrl(output: string): string | null {
  const match = /Local:\s+(http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5})/.exec(output);
  return match?.[1] ?? null;
}

export interface OpenCommand {
  command: string;
  args: string[];
}

/**
 * How to ask the operating system to open an address in the default browser. The address is
 * only ever one that `findLocalUrl` accepted, so it contains nothing a shell could misread.
 */
export function openCommand(platform: NodeJS.Platform, url: string): OpenCommand {
  if (platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '""', url] };
  }
  if (platform === 'darwin') {
    return { command: 'open', args: [url] };
  }
  return { command: 'xdg-open', args: [url] };
}

export function browserOpeningDisabled(argv: string[], env: Record<string, string | undefined>): boolean {
  return argv.includes('--no-open') || ['1', 'true'].includes((env['GREENLIGHT_NO_BROWSER'] ?? '').toLowerCase());
}

export function isPortFree(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, host);
  });
}

/**
 * The dashboard does not move to another port by itself when its usual one is taken, so the
 * launcher looks for the first free one, starting at the usual one.
 */
export async function findFreePort(
  start: number,
  isFree: (port: number) => Promise<boolean> = isPortFree,
  attempts = 50,
): Promise<number> {
  for (let port = start; port < start + attempts; port += 1) {
    if (await isFree(port)) {
      return port;
    }
  }
  throw new Error(`No free port was found from ${start} to ${start + attempts - 1}.`);
}
