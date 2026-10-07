/** The oldest Node.js GreenLight runs on: the one that can read a .env file itself. */
export const MINIMUM_NODE = { major: 22, minor: 12 } as const;

export function nodeVersionProblem(version: string): string | null {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  const supported = major > MINIMUM_NODE.major || (major === MINIMUM_NODE.major && minor >= MINIMUM_NODE.minor);
  if (supported) {
    return null;
  }
  return `GreenLight needs Node.js ${MINIMUM_NODE.major}.${MINIMUM_NODE.minor} or newer and this computer has ${version}. Install the current LTS version from https://nodejs.org and run the command again.`;
}
