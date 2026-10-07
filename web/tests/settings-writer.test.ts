import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ENV_FILE_VARIABLE, EnvFileError, envFilePath, readEnvFile, rootEnvPath } from '@/lib/server/environment';
import { clearSettings, saveSettings } from '@/lib/server/settings-writer';

let folder: string;
let file: string;

beforeEach(() => {
  folder = mkdtempSync(path.join(tmpdir(), 'greenlight-writer-'));
  file = path.join(folder, '.env');
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

const values = { N8N_BASE_URL: 'https://n8n.example.com', N8N_API_KEY: 'sentinel-key-123' };

function canLink(): boolean {
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

async function messageOf(task: Promise<unknown>): Promise<string> {
  try {
    await task;
  } catch (error) {
    return (error as Error).message;
  }
  return '';
}

describe('where the settings live', () => {
  it('is the file at the root of the project unless the process says otherwise', () => {
    expect(envFilePath({}, path.join(folder, 'web'))).toBe(rootEnvPath(path.join(folder, 'web')));
    expect(envFilePath({ [ENV_FILE_VARIABLE]: file })).toBe(file);
  });

  it('ignores a blank override', () => {
    expect(envFilePath({ [ENV_FILE_VARIABLE]: '   ' }, path.join(folder, 'web'))).toBe(rootEnvPath(path.join(folder, 'web')));
  });
});

describe('saveSettings', () => {
  it('creates the file with the two settings', async () => {
    await saveSettings(file, values);
    expect(readEnvFile(file)).toEqual(values);
  });

  it('keeps every other line, comments and order as they were', async () => {
    writeFileSync(file, '# my settings\nGREENLIGHT_SCAN_INTERVAL_MINUTES=10\nN8N_API_KEY=old\nOTHER=1\n');

    await saveSettings(file, values);

    expect(readFileSync(file, 'utf8')).toBe(
      '# my settings\nGREENLIGHT_SCAN_INTERVAL_MINUTES=10\nN8N_API_KEY=sentinel-key-123\nOTHER=1\nN8N_BASE_URL=https://n8n.example.com\n',
    );
  });

  it('leaves no temporary file behind', async () => {
    await saveSettings(file, values);
    expect(readdirSync(folder)).toEqual(['.env']);
  });

  it.skipIf(process.platform === 'win32')('makes the file readable by its owner only', async () => {
    await saveSettings(file, values);
    expect(lstatSync(file).mode & 0o777).toBe(0o600);
  });

  it.skipIf(process.platform === 'win32')('narrows a file that was open to everyone', async () => {
    writeFileSync(file, 'OTHER=1\n', { mode: 0o644 });
    await saveSettings(file, values);
    expect(lstatSync(file).mode & 0o777).toBe(0o600);
  });

  it('refuses a value with a line break, so it cannot add a setting of its own', async () => {
    writeFileSync(file, 'OTHER=1\n');

    const message = await messageOf(saveSettings(file, { ...values, N8N_API_KEY: 'key\nEVIL=1' }));

    expect(message).toContain('line break');
    expect(readFileSync(file, 'utf8')).toBe('OTHER=1\n');
  });

  it('refuses every control character, not only line breaks', async () => {
    for (const character of ['\r', '\u0000', '\u001b', '\u007f']) {
      expect(await messageOf(saveSettings(file, { ...values, N8N_BASE_URL: `https://x${character}y` }))).toContain('control character');
    }
    expect(existsSync(file)).toBe(false);
  });

  it.skipIf(!canLink())('refuses a symbolic link and never writes through it', async () => {
    const target = path.join(folder, 'elsewhere.txt');
    writeFileSync(target, 'UNTOUCHED=1\n');
    symlinkSync(target, file);

    const message = await messageOf(saveSettings(file, values));

    expect(message).toContain('symbolic link');
    expect(message).not.toContain(folder);
    expect(readFileSync(target, 'utf8')).toBe('UNTOUCHED=1\n');
  });

  it('refuses to replace something that is not a regular file', async () => {
    mkdirSync(file);

    const message = await messageOf(saveSettings(file, values));

    expect(message).toMatch(/^The (\.env entry is not a regular file|settings file cannot be written \(\w+\))\.$/);
    expect(message).not.toContain(folder);
    expect(lstatSync(file).isDirectory()).toBe(true);
    expect(readdirSync(folder)).toEqual(['.env']);
  });

  it('refuses a file that has grown too large to be a settings file', async () => {
    writeFileSync(file, `X=${'a'.repeat(70 * 1024)}\n`);

    expect(await messageOf(saveSettings(file, values))).toContain('64 KiB');
  });

  it('survives two connections at the same moment without corrupting the file', async () => {
    writeFileSync(file, '# keep me\nOTHER=1\n');

    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        saveSettings(file, { N8N_BASE_URL: `https://host-${index}.example.com`, N8N_API_KEY: `key-${index}` }),
      ),
    );

    const text = readFileSync(file, 'utf8');
    const parsed = readEnvFile(file);
    expect(text.startsWith('# keep me\nOTHER=1\n')).toBe(true);
    expect(text.match(/^N8N_BASE_URL=/gm)).toHaveLength(1);
    expect(text.match(/^N8N_API_KEY=/gm)).toHaveLength(1);
    expect(parsed['N8N_BASE_URL']?.replace(/\D/g, '')).toBe(parsed['N8N_API_KEY']?.replace(/\D/g, ''));
    expect(readdirSync(folder)).toEqual(['.env']);
  });

  it('keeps working after a write that failed', async () => {
    mkdirSync(file);
    await messageOf(saveSettings(file, values));
    rmSync(file, { recursive: true });

    await saveSettings(file, values);

    expect(readEnvFile(file)).toEqual(values);
  });
});

describe('clearSettings', () => {
  it('removes the two settings and keeps the rest', async () => {
    writeFileSync(file, '# note\nN8N_BASE_URL=https://n8n.example.com\nOTHER=1\nN8N_API_KEY=k\n');

    expect(await clearSettings(file)).toBe(true);

    expect(readFileSync(file, 'utf8')).toBe('# note\nOTHER=1\n');
  });

  it('reports that nothing was there', async () => {
    expect(await clearSettings(file)).toBe(false);
    writeFileSync(file, 'OTHER=1\n');
    expect(await clearSettings(file)).toBe(false);
    expect(readFileSync(file, 'utf8')).toBe('OTHER=1\n');
  });

  it.skipIf(!canLink())('refuses a symbolic link', async () => {
    const target = path.join(folder, 'elsewhere.txt');
    writeFileSync(target, 'N8N_API_KEY=k\n');
    symlinkSync(target, file);

    expect(await messageOf(clearSettings(file))).toContain('symbolic link');
    expect(readFileSync(target, 'utf8')).toBe('N8N_API_KEY=k\n');
  });

  it('only ever touches the two settings it is named for', async () => {
    writeFileSync(file, 'N8N_API_KEY=k\nGREENLIGHT_WEBHOOK_URL=https://hooks.example.test/x\n');
    await clearSettings(file);
    expect(readFileSync(file, 'utf8')).toBe('GREENLIGHT_WEBHOOK_URL=https://hooks.example.test/x\n');
    expect(EnvFileError).toBeDefined();
  });
});
