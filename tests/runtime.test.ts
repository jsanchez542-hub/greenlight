import { describe, expect, it } from 'vitest';
import { nodeVersionProblem } from '../src/runtime.js';

describe('nodeVersionProblem', () => {
  it('accepts the minimum and anything newer', () => {
    for (const version of ['22.12.0', '22.17.0', '22.99.1', '23.0.0', '24.1.2', '30.0.0']) {
      expect(nodeVersionProblem(version), version).toBeNull();
    }
  });

  it('explains what to do on an older version', () => {
    for (const version of ['18.19.0', '20.12.2', '22.11.9', '21.7.3']) {
      const message = nodeVersionProblem(version);

      expect(message, version).toContain('22.12');
      expect(message, version).toContain(version);
      expect(message, version).toContain('nodejs.org');
    }
  });

  it('does not stumble on a version it cannot read', () => {
    expect(nodeVersionProblem('')).toContain('nodejs.org');
  });
});
