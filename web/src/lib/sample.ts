import type { ScanResult } from 'greenlight';
import demoScan from '../../../examples/scan-result.json';
import { parseScanResult } from './scan-result';

export const sampleResult: ScanResult = parseScanResult(demoScan);
