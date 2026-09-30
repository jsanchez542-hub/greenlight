export { loadConfig, loadWatchConfig, type Config, type WatchConfig } from './config.js';
export { N8nApiError, N8nClient, type N8nClientOptions } from './n8n/client.js';
export { renderReport } from './report.js';
export {
  SCAN_RESULT_VERSION,
  scan,
  type ScanOptions,
  type ScanResult,
  type WorkflowHealth,
  type WorkflowSummary,
} from './scan.js';
export {
  defaultAnalysisOptions,
  type AnalysisOptions,
  type DetectorName,
  type Finding,
  type Severity,
} from './analysis/types.js';
export { atLeast, findingKey, trackFindings, type FindingChanges, type TrackedFinding } from './watch/findings.js';
export {
  WebhookError,
  buildFailureAlert,
  buildFindingsAlert,
  buildRecoveryAlert,
  deliverAlert,
  type AlertPayload,
} from './watch/notify.js';
export { FileStateStore, type StateStore, type WatchState } from './watch/state.js';
export { defaultWatchOptions, runCycle, watch, type CycleOutcome, type WatchDependencies } from './watch/watch.js';
