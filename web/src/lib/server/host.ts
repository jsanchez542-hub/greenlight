type Environment = Record<string, string | undefined>;

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

function hostnameOf(hostHeader: string): string | undefined {
  try {
    return new URL(`http://${hostHeader}`).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

export function isAllowedHost(hostHeader: string | null, env: Environment = process.env): boolean {
  if (hostHeader === null) {
    return false;
  }
  const hostname = hostnameOf(hostHeader);
  if (hostname === undefined) {
    return false;
  }
  const extra = (env['GREENLIGHT_ALLOWED_HOSTS'] ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== '');
  return [...LOOPBACK_HOSTS, ...extra].includes(hostname);
}
