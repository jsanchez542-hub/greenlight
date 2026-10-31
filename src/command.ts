/**
 * What a person types to start this program, given how they started it. Run through npx the
 * command `greenlight` does not exist on their computer, so the messages that tell them what to
 * type next have to name the one that does.
 */
export function commandName(env: Record<string, string | undefined> = process.env): string {
  return env['npm_command'] === 'exec' ? 'npx greenlight-n8n' : 'greenlight';
}
