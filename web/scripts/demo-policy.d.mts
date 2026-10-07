export function inlineScripts(html: string): string[];
export function inlineScriptHashes(html: string): string[];
export function contentSecurityPolicy(hashes: readonly string[]): string;
export function policyTag(hashes: readonly string[]): string;
export function withPolicy(html: string): string;
export function policyOf(html: string): string | null;
