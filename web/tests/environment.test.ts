import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { currentEnvironment, readEnvFile, rootEnvPath } from '@/lib/server/environment';

let folder: string;
let envPath: string;

beforeEach(() => {
  folder = mkdtempSync(path.join(tmpdir(), 'greenlight-env-'));
  envPath = path.join(folder, '.env');
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe('readEnvFile', () => {
  it('reads plain and quoted values', () => {
    writeFileSync(envPath, 'N8N_BASE_URL="https://n8n.test/?a=1&b=2"\nN8N_API_KEY=abc.def-123\n');
    expect(readEnvFile(envPath)).toEqual({
      N8N_BASE_URL: 'https://n8n.test/?a=1&b=2',
      N8N_API_KEY: 'abc.def-123',
    });
  });

  it('returns nothing when the file does not exist', () => {
    expect(readEnvFile(envPath)).toEqual({});
  });

  it('names the file and the reason when it cannot be read', () => {
    expect(() => readEnvFile(folder)).toThrow('Could not read greenlight-env-');
  });
});

describe('currentEnvironment', () => {
  it('uses the file when the process sets nothing', () => {
    writeFileSync(envPath, 'N8N_BASE_URL=https://n8n.test\nN8N_API_KEY=file-key\n');
    expect(currentEnvironment({}, envPath)).toMatchObject({ N8N_API_KEY: 'file-key' });
  });

  it('lets the process environment win over the file', () => {
    writeFileSync(envPath, 'N8N_API_KEY=file-key\n');
    const env = currentEnvironment({ N8N_API_KEY: 'process-key' }, envPath);
    expect(env['N8N_API_KEY']).toBe('process-key');
  });

  it('treats blank process values as unset so a copied template cannot hide the file', () => {
    writeFileSync(envPath, 'N8N_API_KEY=file-key\n');
    expect(currentEnvironment({ N8N_API_KEY: '', N8N_BASE_URL: '   ' }, envPath)['N8N_API_KEY']).toBe(
      'file-key',
    );
  });

  it('reads the file again on every call', () => {
    expect(currentEnvironment({}, envPath)['N8N_API_KEY']).toBeUndefined();

    writeFileSync(envPath, 'N8N_API_KEY=saved-later\n');
    expect(currentEnvironment({}, envPath)['N8N_API_KEY']).toBe('saved-later');

    writeFileSync(envPath, 'N8N_API_KEY=changed\n');
    expect(currentEnvironment({}, envPath)['N8N_API_KEY']).toBe('changed');
  });
});

describe('rootEnvPath', () => {
  it('points at the .env one level above the web folder', () => {
    expect(rootEnvPath(path.join(folder, 'web'))).toBe(envPath);
  });
});
