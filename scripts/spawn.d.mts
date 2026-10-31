import type { ChildProcess, SpawnOptions, SpawnSyncOptions, SpawnSyncReturns } from 'node:child_process';

export function quoteForWindows(argument: string): string;
export function spawnCommand(command: string, args: string[], options?: SpawnOptions): ChildProcess;
export function spawnCommandSync(command: string, args: string[], options?: SpawnSyncOptions): SpawnSyncReturns<string>;
