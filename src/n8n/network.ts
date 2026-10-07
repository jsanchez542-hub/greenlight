/**
 * True for addresses that are not reachable from the public internet, where plain http is a
 * reasonable choice: the machine itself, private IPv4 ranges, and names without a public suffix
 * such as the service names Docker gives to containers.
 */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (host === 'localhost' || host === '::1' || host.endsWith('.localhost')) {
    return true;
  }
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) {
    return host.includes(':');
  }

  const parts = host.split('.');
  if (parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part))) {
    const [a, b] = parts.map(Number) as [number, number];
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }

  return !host.includes('.') || ['.local', '.lan', '.internal', '.home.arpa'].some((suffix) => host.endsWith(suffix));
}
