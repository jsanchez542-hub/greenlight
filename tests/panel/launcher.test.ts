import { describe, expect, it } from 'vitest';
import { browserOpeningDisabled, findFreePort, findLocalUrl, isPortFree, openCommand } from '../../src/panel/launcher.js';

describe('findLocalUrl', () => {
  it('reads the address from what the dashboard prints', () => {
    const output = '   ▲ Next.js 16\n   - Local:         http://127.0.0.1:3000\n   - Network:      http://127.0.0.1:3000\n';

    expect(findLocalUrl(output)).toBe('http://127.0.0.1:3000');
  });

  it('follows the dashboard to another port when 3000 is taken', () => {
    expect(findLocalUrl('- Local: http://127.0.0.1:3001')).toBe('http://127.0.0.1:3001');
  });

  it('accepts localhost too', () => {
    expect(findLocalUrl('- Local: http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('says nothing while the dashboard has not announced itself', () => {
    expect(findLocalUrl('Starting...')).toBeNull();
  });

  it('never accepts an address that is not on this machine, whatever the output says', () => {
    expect(findLocalUrl('- Local: http://attacker.example.net:3000')).toBeNull();
    expect(findLocalUrl('- Local: http://127.0.0.1.attacker.example.net:3000')).toBeNull();
    expect(findLocalUrl('- Local: http://127.0.0.1:3000/&calc')).toBe('http://127.0.0.1:3000');
  });
});

describe('openCommand', () => {
  it('uses the right opener on each system', () => {
    expect(openCommand('win32', 'http://127.0.0.1:3000').command).toBe('cmd');
    expect(openCommand('darwin', 'http://127.0.0.1:3000').command).toBe('open');
    expect(openCommand('linux', 'http://127.0.0.1:3000').command).toBe('xdg-open');
  });

  it('passes the address as a separate argument', () => {
    expect(openCommand('linux', 'http://127.0.0.1:3000').args).toEqual(['http://127.0.0.1:3000']);
  });
});

describe('browserOpeningDisabled', () => {
  it('can be switched off with a flag or a variable', () => {
    expect(browserOpeningDisabled(['--no-open'], {})).toBe(true);
    expect(browserOpeningDisabled([], { GREENLIGHT_NO_BROWSER: '1' })).toBe(true);
    expect(browserOpeningDisabled([], {})).toBe(false);
  });
});

describe('findFreePort', () => {
  it('uses the usual port when it is free', async () => {
    expect(await findFreePort(3000, async () => true)).toBe(3000);
  });

  it('moves to the next free port when the usual one is taken', async () => {
    const taken = new Set([3000, 3001]);

    expect(await findFreePort(3000, async (port) => !taken.has(port))).toBe(3002);
  });

  it('gives up with a clear message when nothing is free', async () => {
    await expect(findFreePort(3000, async () => false, 5)).rejects.toThrow('No free port was found from 3000 to 3004');
  });

  it('really notices a port that something is listening on', async () => {
    const { createServer } = await import('node:net');
    const holder = createServer();
    await new Promise<void>((resolve) => holder.listen(0, '127.0.0.1', resolve));
    const port = (holder.address() as { port: number }).port;

    expect(await isPortFree(port)).toBe(false);
    await new Promise((resolve) => holder.close(resolve));
    expect(await isPortFree(port)).toBe(true);
  });
});
