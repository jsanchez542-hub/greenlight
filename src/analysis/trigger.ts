import { isRecord } from '../n8n/shape.js';

const scheduleTriggerTypes = new Set([
  'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.cron',
  'n8n-nodes-base.intervalTrigger',
]);

/**
 * The nodes come from the instance as it sent them. A workflow whose nodes cannot be read is
 * taken for one that does not run on a clock, which only means the silence check leaves it alone.
 */
export function runsOnAClock(nodes: unknown): boolean {
  return (
    Array.isArray(nodes) &&
    nodes.some((node) => isRecord(node) && typeof node['type'] === 'string' && scheduleTriggerTypes.has(node['type']))
  );
}
