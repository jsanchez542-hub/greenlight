import type { ScanResult } from 'greenlight-n8n';
import demoScan from '../../../examples/scan-result.json';
import { parseScanResult } from './scan-result';

export const sampleResult: ScanResult = parseScanResult(demoScan);
