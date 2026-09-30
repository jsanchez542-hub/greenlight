import type { DetectorName, Severity } from 'greenlight';

export interface Threshold {
  name: string;
  value: string;
}

export interface DetectorInfo {
  label: string;
  severity: Severity;
  question: string;
  appliesTo: string;
  method: string;
  thresholds: readonly Threshold[];
  review: string;
}

export const detectorInfo: Record<DetectorName, DetectorInfo> = {
  'silent-error': {
    label: 'Silent error',
    severity: 'critical',
    question: 'Did a step fail inside a run that reported success?',
    appliesTo: 'Active workflows with a recent successful execution',
    method:
      'Opens a sample of the most recent successful executions and reads the output of every node. A node that emits an error as ordinary data is reported, even though the run finished green. This usually happens when a step has continue on fail enabled. A workflow that is switched off is not checked, because its history may hold old failures nobody needs to act on.',
    thresholds: [
      { name: 'sample', value: '5 successful executions by default' },
      { name: 'history needed', value: 'none' },
    ],
    review:
      'Open the named node and read the error it returns. Check the credential or service behind it, then decide whether the workflow should stop on that failure instead of carrying on.',
  },
  'duration-drift': {
    label: 'Duration drift',
    severity: 'warning',
    question: 'Is this workflow suddenly much slower than it used to be?',
    appliesTo: 'Any workflow with enough history',
    method:
      'Compares the median run time of recent executions with the same workflow’s own history. Either condition alone reports ordinary variation, so both must hold.',
    thresholds: [
      { name: 'recent median', value: 'above the historical 95th percentile' },
      { name: 'recent median', value: 'at least twice the historical median' },
      { name: 'baseline runs', value: '10 or more' },
      { name: 'recent runs', value: '3 or more' },
    ],
    review:
      'A step is probably retrying or waiting on a downstream service before it gives up. Compare a recent slow execution with an older fast one and look for the node whose time changed.',
  },
  silence: {
    label: 'Silence',
    severity: 'critical',
    question: 'Has a scheduled workflow stopped running without being switched off?',
    appliesTo: 'Active workflows started by a clock',
    method:
      'Compares the time since the last run with the usual interval between runs. Workflows started by webhooks or polling triggers are not judged, because a quiet period can be normal for them.',
    thresholds: [
      { name: 'quiet for', value: 'more than 4 times the usual interval' },
      { name: 'runs needed', value: '3 or more, to learn the interval' },
    ],
    review:
      'Check that the workflow is still active and that its schedule trigger is still registered. Then look at the instance logs around the time of the last run.',
  },
  'frequency-drop': {
    label: 'Frequency drop',
    severity: 'warning',
    question: 'Is it still running, but far less often than before?',
    appliesTo: 'Active workflows started by a clock',
    method:
      'Counts the runs in the recent window and compares them with what the workflow’s own history predicts. A workflow that did not run at all in the window is judged by the silence check instead, which compares the gap against the workflow’s usual interval.',
    thresholds: [
      { name: 'window', value: '24 hours' },
      { name: 'reports when', value: 'fewer than half the predicted runs' },
      { name: 'baseline runs', value: '10 or more' },
    ],
    review:
      'Compare the schedule trigger as it is configured today with the cadence the history shows. An edited interval is the usual cause.',
  },
};
