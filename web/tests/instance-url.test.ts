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
});
