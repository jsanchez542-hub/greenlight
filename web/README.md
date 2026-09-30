# GreenLight dashboard

A web view of one GreenLight scan: how many workflows were checked, which checks raised
findings, and what evidence each finding rests on.

It shows a snapshot. The scan result holds no time series, so the dashboard draws none.

## Two modes

**Demo data** is the default and the only mode a public deployment has. It renders
[`examples/scan-result.json`](../examples/scan-result.json), which the program generated
against an invented instance held in memory. It never contacts anything.

**Live instance** is for running locally. When the server process has `N8N_BASE_URL` and
`N8N_API_KEY` in its environment, a switch appears in the header. Choosing it makes the
server call `scan()` from the parent package and return the result. The key stays on the
server: it is never sent to the browser and failure messages are stripped of it before they
are returned. A scan reads every workflow's history, so on a mid-sized instance it takes tens
of seconds; the page shows elapsed time while it waits and offers a way back to the demo.

Without those variables the page runs in demo mode and the live route answers 404.

Do not set the variables on a public deployment. Anyone who can open the page could then
trigger scans of that instance and read the result.

## Running it

Node 22.12 or newer. Install the scanner's dependencies at the repository root, then start
the dashboard:

```bash
npm install
cd web
npm install
npm run dev
```

`dev`, `build` and `typecheck` rebuild the parent package first, because the dashboard
imports its compiled output and its types. Open <http://localhost:3000>.

For live mode, create `web/.env.local` from `.env.example`:

```
N8N_BASE_URL=https://n8n.example.com
N8N_API_KEY=your-key
```

`GREENLIGHT_EXECUTION_LIMIT` and `GREENLIGHT_DETAIL_SAMPLE` are honoured as well, with the
same meaning as in the command line tool.

| Script | Purpose |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emitting |
| `npm test` | unit tests |

## What it shows

1. **Summary.** Scan date, number of workflows, findings by severity, and how the workflows
   split across the four states. A scan with no findings says "Nothing to report".
2. **Findings.** One card per finding with the backend's own summary text, the evidence as
   key and value, and a section describing what the check does and what to review. The
   wording comes from the "How it decides" section of the main README.
3. **Workflows.** Every workflow that was checked, filterable by state. Last run is given
   relative to the scan time, not to the moment you open the page, with the exact UTC time
   on hover.
4. **Loading and failure** for the live mode.

`no-runs` is neutral grey because it is not a verdict: the instance held no history to judge.
`healthy` means history was read and no check found anything, not that nothing is wrong.
State is always carried by a label and a distinct icon shape as well as colour.

## Layout

```
src/app/            page, layout and the /api/scan route
src/components/     presentation, one component per file with its stylesheet
src/lib/            parsing, formatting, grouping and the live scan
src/lib/server/     code that only runs on the server
tests/              unit tests for everything in src/lib
```

Types come from the parent package, so the contract has one source of truth. Scan results
are validated on arrival, both from the demo file and from the live route, and a result
whose `version` is not 1 is rejected rather than half displayed.

Dependencies: Next.js and React, and the parent package. Styling is plain CSS modules.
ESLint is on version 9 and TypeScript on 6 because `typescript-eslint` does not yet support
TypeScript 7, which the parent package uses.
