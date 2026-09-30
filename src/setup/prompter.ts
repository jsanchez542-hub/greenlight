import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import type { Prompter } from './init.js';

export class SetupCancelled extends Error {
  constructor() {
    super('Setup cancelled.');
    this.name = 'SetupCancelled';
  }
}

export interface TerminalPrompter extends Prompter {
  close(): void;
}

/**
 * Reads answers from the terminal. Secrets are read with the echo switched off, so a key
 * never appears on screen or in the scrollback. When input is piped instead of typed there
 * is nothing to hide, and the answers are simply read line by line.
 */
export function createTerminalPrompter(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream & { isTTY?: boolean } = process.stdout,
): TerminalPrompter {
  let muted = false;
  const gate = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) {
        output.write(chunk, encoding);
      }
      callback();
    },
  });

  const rl = createInterface({ input, output: gate, terminal: output.isTTY === true });

  // Lines are queued as they arrive. Reading one line per question would drop the lines that
  // come in while no question is waiting, which is what happens when answers are pasted or piped.
  const queue: string[] = [];
  let waiting: { resolve: (line: string) => void; reject: (error: Error) => void } | null = null;
  let ended = false;

  rl.on('line', (line) => {
    if (waiting === null) {
      queue.push(line);
      return;
    }
    const { resolve } = waiting;
    waiting = null;
    resolve(line);
  });
  rl.once('close', () => {
    ended = true;
    if (waiting !== null) {
      const { reject } = waiting;
      waiting = null;
      reject(new SetupCancelled());
    }
  });
  rl.on('SIGINT', () => rl.close());

  function read(): Promise<string> {
    const queued = queue.shift();
    if (queued !== undefined) {
      return Promise.resolve(queued);
    }
    if (ended) {
      return Promise.reject(new SetupCancelled());
    }
    return new Promise<string>((resolve, reject) => {
      waiting = { resolve, reject };
    });
  }

  return {
    async ask(question, options = {}) {
      const suffix = options.defaultValue === undefined ? '' : ` [${options.defaultValue}]`;
      output.write(`${question}${suffix}: `);
      muted = options.secret === true;
      try {
        const answer = (await read()).trim();
        return answer === '' && options.defaultValue !== undefined ? options.defaultValue : answer;
      } finally {
        muted = false;
        if (options.secret === true) {
          output.write('\n');
        }
      }
    },

    async confirm(question, defaultYes) {
      output.write(`${question} ${defaultYes ? '[Y/n]' : '[y/N]'} `);
      const answer = (await read()).trim().toLowerCase();
      if (answer === '') {
        return defaultYes;
      }
      return answer === 'y' || answer === 'yes';
    },

    say(line) {
      output.write(`${line}\n`);
    },

    close() {
      rl.close();
    },
  };
}
