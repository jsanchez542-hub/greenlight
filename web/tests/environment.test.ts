import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EnvFileError,
  MAX_ENV_FILE_BYTES,
  currentEnvironment,
  describeEnvironmentProblem,
  readEnvFile,
  rootEnvPath,
} from '@/lib/server/environment';

function canCreateSymlinks(): boolean {
  const probe = mkdtempSync(path.join(tmpdir(), 'greenlight-link-'));
  try {
    writeFileSync(path.join(probe, 'target'), '');
    symlinkSync(path.join(probe, 'target'), path.join(probe, 'link'));
    return true;
  } catch {
    return false;
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
}

const linksAllowed = canCreateSymlinks();

let folder: string;
let envPath: string;

beforeEach(() => {
  folder = mkdtempSync(path.join(tmpdir(), 'greenlight-env-'));
  envPath = path.join(folder, '.env');
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

function messageOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as Error).message;
  }
  return '';
}

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

  it('reports an entry that cannot be read as a readable error that never names the path', () => {
    const message = messageOf(() => readEnvFile(folder));

    expect(message).toMatch(/^The \.env (file cannot be read \(\w+\)|entry is not a regular file)\.$/);
    expect(message).not.toContain(folder);
    expect(message).not.toContain('greenlight-env-');
  });

  it('refuses a file too large to be a settings file instead of reading it', () => {
    writeFileSync(envPath, `N8N_API_KEY=${'a'.repeat(MAX_ENV_FILE_BYTES)}\n`);

    expect(() => readEnvFile(envPath)).toThrow(EnvFileError);
    expect(messageOf(() => readEnvFile(envPath))).toContain('larger than 64 KiB');
  });

  it('accepts a file well inside the limit', () => {
    writeFileSync(envPath, `N8N_API_KEY=${'a'.repeat(1000)}\n`);
    expect(readEnvFile(envPath)['N8N_API_KEY']).toHaveLength(1000);
  });

  it('survives binary, empty and odd content without throwing', () => {
    writeFileSync(envPath, Buffer.from([0, 255, 254, 10, 61, 61, 10, 0x4e, 0x3d, 0]));
    expect(() => readEnvFile(envPath)).not.toThrow();

    writeFileSync(envPath, '');
    expect(readEnvFile(envPath)).toEqual({});

    writeFileSync(envPath, '=\n===\n# comment\nNOT A PAIR\nA="unterminated\n');
    expect(() => readEnvFile(envPath)).not.toThrow();
  });

  it.skipIf(!linksAllowed)('refuses a symbolic link and never reads what it points to', () => {
    const target = path.join(folder, 'elsewhere.txt');
    writeFileSync(target, 'N8N_API_KEY=from-the-target\n');
    symlinkSync(target, envPath);

    const message = messageOf(() => readEnvFile(envPath));

    expect(message).toContain('symbolic link');
    expect(message).not.toContain('from-the-target');
    expect(message).not.toContain(folder);
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

describe('describeEnvironmentProblem', () => {
  it('shows the safe message of an environment error', () => {
    const error = new EnvFileError('The .env file cannot be read (EACCES).');
    expect(describeEnvironmentProblem(error)).toBe('The .env file cannot be read (EACCES).');
  });

  it('hides the message of anything else, which could carry a path', () => {
    const error = new Error("EACCES: permission denied, open '/home/someone/project/.env'");
    expect(describeEnvironmentProblem(error)).toBe('The settings could not be read.');
  });
});
