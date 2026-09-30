export { loadConfig, type Config } from './config.js';
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
