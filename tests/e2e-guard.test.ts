import { describe, expect, it } from 'vitest';
import { assertThrowawayInstance } from '../e2e/guard.mjs';

describe('the end-to-end test only runs against an n8n on this machine', () => {
  it.each([
    ['http://127.0.0.1:5678', 'http://127.0.0.1:5678'],
    ['http://localhost:5678/', 'http://localhost:5678'],
    ['http://[::1]:5678', 'http://[::1]:5678'],
    ['https://127.0.0.1:8443', 'https://127.0.0.1:8443'],
  ])('accepts %s', (address, normalised) => {
    expect(assertThrowawayInstance(address)).toBe(normalised);
  });

  it.each([
    'https://n8n.example.com',
    'http://192.168.1.10:5678',
    'http://10.0.0.5:5678',
    'http://0.0.0.0:5678',
    'http://127.0.0.1.evil.example',
    'http://localhost.evil.example:5678',
    'http://evil.example/127.0.0.1',
    'ftp://127.0.0.1:5678',
    'file:///127.0.0.1',
  ])('refuses %s, which is not this machine', (address) => {
    expect(() => assertThrowawayInstance(address)).toThrow(/on this machine/);
  });

  it.each(['http://user:secret@127.0.0.1:5678', 'http://127.0.0.1:5678/api/v1', 'http://127.0.0.1:5678/some/path'])(
    'refuses %s, which is more than the address of the instance',
    (address) => {
      expect(() => assertThrowawayInstance(address)).toThrow(/address of the instance alone/);
    },
  );

  it.each(['', 'not an address', 'localhost:5678'])('refuses "%s", which is not an address', (address) => {
    expect(() => assertThrowawayInstance(address)).toThrow();
  });
});
