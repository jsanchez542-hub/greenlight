import { describe, expect, it } from 'vitest';
import { checkInstanceUrl } from '@/lib/server/instance-url';

describe('checkInstanceUrl', () => {
  it('accepts plain http and https addresses', () => {
    expect(checkInstanceUrl('https://n8n.example.com').ok).toBe(true);
    expect(checkInstanceUrl(' http://localhost:5678/ ').ok).toBe(true);
  });

  it('refuses schemes that are not http or https', () => {
    for (const value of ['file:///etc/passwd', 'javascript:alert(1)', 'ftp://host', 'data:text/plain,x', 'gopher://host']) {
      expect(checkInstanceUrl(value).ok).toBe(false);
    }
  });

  it('refuses credentials in the address, which would travel with the key and leak into messages', () => {
    const result = checkInstanceUrl('https://user:secret@n8n.example.com');
    expect(result).toEqual({ ok: false, reason: 'The address contains a user name or password.' });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('refuses empty, malformed and enormous values', () => {
    expect(checkInstanceUrl(undefined).ok).toBe(false);
    expect(checkInstanceUrl('   ').ok).toBe(false);
    expect(checkInstanceUrl('not a url').ok).toBe(false);
    expect(checkInstanceUrl(`https://${'a'.repeat(3000)}.example.com`).ok).toBe(false);
  });

  it('refuses plain http to a public host, where the key would travel unencrypted', () => {
    expect(checkInstanceUrl('http://n8n.example.com').ok).toBe(false);
    expect(checkInstanceUrl('http://203.0.113.9:5678').ok).toBe(false);
  });

  it('allows plain http on the machine itself and on private networks', () => {
    for (const value of ['http://localhost:5678', 'http://127.0.0.1:5678', 'http://192.168.1.20:5678', 'http://n8n:5678', 'http://box.local']) {
      expect(checkInstanceUrl(value).ok).toBe(true);
    }
  });

  it('allows plain http to a public host only when the operator opted in', () => {
    expect(checkInstanceUrl('http://n8n.example.com', true).ok).toBe(true);
  });
});
