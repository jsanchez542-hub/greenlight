import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadWatchConfig } from '../../src/config.js';
import { FileStateStore, emptyState } from '../../src/watch/state.js';

let directory: string;
let warnings: string[];

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'greenlight-'));
  warnings = [];
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('FileStateStore', () => {
  it('starts empty without complaining when nothing was saved yet', () => {
    const store = new FileStateStore(join(directory, 'state.json'), (line) => warnings.push(line));

    expect(store.load()).toEqual(emptyState());
    expect(warnings).toEqual([]);
  });

  it('gives back what was saved', () => {
    const store = new FileStateStore(join(directory, 'nested', 'state.json'), (line) => warnings.push(line));
    const state = { ...emptyState(), consecutiveFailures: 2, degraded: true };

    store.save(state);

    expect(store.load()).toEqual(state);
  });

  it('replaces the file in one piece and leaves no temporary copy', () => {
    const path = join(directory, 'state.json');
    const store = new FileStateStore(path, (line) => warnings.push(line));

    store.save(emptyState());
    store.save({ ...emptyState(), consecutiveFailures: 1 });

    expect(JSON.parse(readFileSync(path, 'utf8')).consecutiveFailures).toBe(1);
    expect(() => readFileSync(`${path}.tmp`)).toThrow();
  });

  it('warns and starts empty when the file is not a state file', () => {
    const path = join(directory, 'state.json');
    writeFileSync(path, '{"hello": "world"}');
    const store = new FileStateStore(path, (line) => warnings.push(line));

    expect(store.load()).toEqual(emptyState());
    expect(warnings).toHaveLength(1);
  });

  it('warns and starts empty when the file is damaged', () => {
    const path = join(directory, 'state.json');
    writeFileSync(path, '{"version": 1, "trac');
    const store = new FileStateStore(path, (line) => warnings.push(line));

    expect(store.load()).toEqual(emptyState());
    expect(warnings).toHaveLength(1);
  });
});

describe('loadWatchConfig', () => {
  it('has working defaults and no webhook', () => {
    expect(loadWatchConfig({})).toEqual({
      webhookUrl: null,
      webhookToken: null,
      intervalMinutes: 5,
      stateFile: '.greenlight-state.json',
      notifyMinimum: 'warning',
    });
  });

  it('reads every setting', () => {
    const config = loadWatchConfig({
      GREENLIGHT_WEBHOOK_URL: 'https://hooks.example.com/abc',
      GREENLIGHT_WEBHOOK_TOKEN: ' token ',
      GREENLIGHT_INTERVAL_MINUTES: '15',
      GREENLIGHT_STATE_FILE: 'state/greenlight.json',
      GREENLIGHT_NOTIFY_MIN: 'Critical',
    });

    expect(config).toEqual({
      webhookUrl: 'https://hooks.example.com/abc',
      webhookToken: 'token',
      intervalMinutes: 15,
      stateFile: 'state/greenlight.json',
      notifyMinimum: 'critical',
    });
  });

  it('rejects a webhook that is not an http URL without echoing it', () => {
    expect(() => loadWatchConfig({ GREENLIGHT_WEBHOOK_URL: 'ftp://secret-host/path' })).toThrow(
      'GREENLIGHT_WEBHOOK_URL must be a valid http or https URL.',
    );
    expect(() => loadWatchConfig({ GREENLIGHT_WEBHOOK_URL: 'secret-host/path' })).not.toThrow(/secret-host/);
  });

  it('rejects an unknown severity and a bad interval', () => {
    expect(() => loadWatchConfig({ GREENLIGHT_NOTIFY_MIN: 'info' })).toThrow('GREENLIGHT_NOTIFY_MIN');
    expect(() => loadWatchConfig({ GREENLIGHT_INTERVAL_MINUTES: '0' })).toThrow('GREENLIGHT_INTERVAL_MINUTES');
  });
});
