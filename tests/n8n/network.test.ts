import { describe, expect, it } from 'vitest';
import { isPrivateHost } from '../../src/n8n/network.js';

describe('isPrivateHost', () => {
  it('recognises the machine itself', () => {
    for (const host of ['localhost', 'LOCALHOST', 'app.localhost', '127.0.0.1', '127.1.2.3', '::1', '[::1]']) {
      expect(isPrivateHost(host), host).toBe(true);
    }
  });

  it('recognises the private IPv4 ranges and nothing near them', () => {
    for (const host of ['10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.0.10', '169.254.1.1']) {
      expect(isPrivateHost(host), host).toBe(true);
    }
    for (const host of ['172.15.0.1', '172.32.0.1', '192.169.0.1', '11.0.0.1', '8.8.8.8', '100.64.0.1']) {
      expect(isPrivateHost(host), host).toBe(false);
    }
  });

  it('recognises names that only exist on a private network', () => {
    for (const host of ['n8n', 'nas.local', 'box.lan', 'svc.internal', 'router.home.arpa']) {
      expect(isPrivateHost(host), host).toBe(true);
    }
  });

  it('treats ordinary public names as public, including ones that merely look private', () => {
    for (const host of ['n8n.example.com', 'local.example.com', 'internal.example.com', '10.0.0.1.example.com', 'fdn.example.org']) {
      expect(isPrivateHost(host), host).toBe(false);
    }
  });
});
