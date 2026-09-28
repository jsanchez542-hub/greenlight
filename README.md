# GreenLight

A production workflow reported success for three weeks while it sent nothing at all.

The step that failed had "continue on fail" enabled, so its error travelled downstream
as ordinary data and every run finished green. What gave it away was the clock:
execution time had drifted from 1.2 to 10.5 seconds, because the node was retrying
against a revoked credential before giving up.

No dashboard shows that. Every run was a success, and the counter said so.

GreenLight reads an n8n instance through its API and looks for the failures that do not
announce themselves.

## What it looks for

| Check | Question it answers |
| --- | --- |
| Silent error | Did a step fail inside a run that reported success? |
| Duration drift | Is this workflow suddenly much slower than it used to be? |
| Silence | Has a scheduled workflow stopped running without being switched off? |
| Frequency drop | Is it still running, but far less often than before? |

Each check is derived from a failure that happened in a real instance, not from a list of
things that might theoretically go wrong.

## Example

```
GreenLight  scanned 18 workflows  3 findings, 1 critical

CRITICAL Order confirmations
         "Send receipt" emitted an error in 5 of the last 5 successful
         executions. The workflow reports success while this step fails.
             node                 Send receipt
             executionsWithError  5
             executionsInspected  5

WARNING  Inventory sync
         Typical run time rose from 1.2s to 10.5s, 8.6 times slower than before,
         which usually means a downstream service is retrying before it gives up.
             baselineMedian   1.2s
             baselineP95      1.5s
             recentMedian     10.5s
             baselineSamples  142
             recentSamples    24

WARNING  Nightly digest
         Ran 1 time in the last 24h where roughly 24 were expected. A schedule
         was probably edited.
             recentRuns    1
             expectedRuns  24
             windowHours   24
             baselineRuns  168
```

That report is the real output of the program, run against a synthetic instance so the
example can show every check at once.

## Usage

```bash
npm install
npm run build

export N8N_BASE_URL=https://n8n.example.com
export N8N_API_KEY=your-key
node dist/cli.js
```

`--json` prints the same result as structured data. The process exits with 1 when
something is found, so it can gate a deployment pipeline.

| Variable | Default | Purpose |
| --- | --- | --- |
| `N8N_BASE_URL` | required | URL of the instance |
| `N8N_API_KEY` | required | API key with read access |
| `GREENLIGHT_EXECUTION_LIMIT` | 200 | executions read per workflow |
| `GREENLIGHT_DETAIL_SAMPLE` | 5 | executions inspected node by node |

Only read endpoints are used. GreenLight never writes to the instance.

## How it decides

**Thresholds come from each workflow, not from a config file.** A workflow that always
takes ten seconds is not a problem. One that used to take one second and now takes ten
is. Duration drift requires the recent median to clear both the historical 95th
percentile and twice the historical median, because either condition alone reports
ordinary variation.

**It refuses to judge without enough history.** No check reports anything below ten
baseline runs and three recent ones. An alert that is confident and wrong costs more
trust than a missed one.

**It reads the trigger node rather than inferring the schedule.** The first version
worked out whether a workflow was scheduled by measuring how evenly its runs were
spaced. That passed every synthetic test and then failed on a real instance: a burst of
manual tests against a webhook workflow is evenly spaced, so it was reported as a dead
trigger. Polling triggers are excluded for a different reason, one that only shows up in
production data. They record a run only when they find something, so an idle Gmail
trigger and a broken one look identical from the outside.

**Detection is deterministic.** Every finding is a comparison between numbers, which is
why each one can be covered by a test and reproduced from the evidence printed beside it.

## Limits

It reads whatever execution history the instance still holds, so a short retention
window limits what can be compared. Workflows that have never run are skipped rather
than guessed at. Detail inspection is sampled, not exhaustive, because that endpoint is
expensive.

## Development

```bash
npm test        # 40 tests
npm run typecheck
npm run build
```

No production dependencies. Node 22 or newer.
