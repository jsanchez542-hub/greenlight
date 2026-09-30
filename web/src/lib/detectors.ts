import type { DetectorName } from 'greenlight';

export interface DetectorInfo {
  label: string;
  question: string;
  method: string;
  review: string;
}

export const detectorInfo: Record<DetectorName, DetectorInfo> = {
  'silent-error': {
    label: 'Silent error',
    question: 'Did a step fail inside a run that reported success?',
    method:
      'GreenLight opens a sample of the most recent successful executions and reads the output of every node. A node that emits an error as ordinary data is reported, even though the run finished green. This usually happens when a step has continue on fail enabled.',
    review:
      'Open the named node and read the error it returns. Check the credential or service behind it, then decide whether the workflow should stop on that failure instead of carrying on.',
  },
  'duration-drift': {
    label: 'Duration drift',
    question: 'Is this workflow suddenly much slower than it used to be?',
    method:
      'Compares the median run time of recent executions with the same workflow’s own history. It reports only when the recent median is above the historical 95th percentile and at least twice the historical median. Below ten baseline runs or three recent ones it stays silent.',
    review:
      'A step is probably retrying or waiting on a downstream service before it gives up. Compare a recent slow execution with an older fast one and look for the node whose time changed.',
  },
  silence: {
    label: 'Silence',
    question: 'Has a scheduled workflow stopped running without being switched off?',
    method:
      'Applies to active workflows started by a clock. It compares the time since the last run with the usual interval between runs and reports a gap far longer than usual. Workflows started by webhooks or polling triggers are not judged, because a quiet period can be normal for them.',
    review:
      'Check that the workflow is still active and that its schedule trigger is still registered. Then look at the instance logs around the time of the last run.',
  },
  'frequency-drop': {
    label: 'Frequency drop',
    question: 'Is it still running, but far less often than before?',
    method:
      'Applies to active workflows started by a clock. It counts the runs in the recent window and compares them with the count the workflow’s own history predicts. A workflow with no runs at all in the window is left to the silence check.',
    review:
      'Compare the schedule trigger as it is configured today with the cadence the history shows. An edited interval is the usual cause.',
  },
};
