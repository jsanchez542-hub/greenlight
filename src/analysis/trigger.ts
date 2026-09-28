import type { WorkflowNode } from '../n8n/types.js';

const scheduleTriggerTypes = new Set([
  'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.cron',
  'n8n-nodes-base.intervalTrigger',
]);

export function runsOnAClock(nodes: WorkflowNode[]): boolean {
  return nodes.some((node) => scheduleTriggerTypes.has(node.type));
}
